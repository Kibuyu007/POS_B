import Sales from "../../Models/Transactions/sales.js";
import Item from "../../Models/Items/items.js";
import Customer from "../../Models/Customers/customer.js";
import NewGrn from "../../Models/Manunuzi/newGrn.js";

import { jsPDF } from "jspdf";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



// Store Transaction
export const storeTransaction = async (req, res) => {
  try {
    const {
      items: soldItems,
      customerDetails,
      loyalCustomer,
      status = "Paid", // Paid | Bill
      tradeDiscount = 0,
    } = req.body;

    /* ===============================
       0. BASIC VALIDATION
    =============================== */
    if (!soldItems || soldItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No items provided",
      });
    }

    /* ===============================
       1. VALIDATE STOCK
    =============================== */
    for (const soldItem of soldItems) {
      const item = await Item.findById(soldItem.item);

      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Item not found",
        });
      }

      if (item.itemQuantity < soldItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${item.name}`,
        });
      }
    }

    /* ===============================
       2. FETCH LOYAL CUSTOMER
    =============================== */
    let loyalCustomerData = null;

    if (loyalCustomer) {
      loyalCustomerData = await Customer.findOne({
        _id: loyalCustomer,
        status: "Active",
      });

      if (!loyalCustomerData) {
        return res.status(404).json({
          success: false,
          message: "Active loyal customer not found",
        });
      }
    }

    /* ===============================
       3. PROCESS ITEMS (RETAIL / WHOLESALE)
    =============================== */
    let subTotal = 0;
    let saleType = "Retail";

    const processedItems = await Promise.all(
      soldItems.map(async (si) => {
        const item = await Item.findById(si.item);

        let appliedPrice = item.price;
        let priceType = "Retail";

        if (
          item.enableWholesale &&
          si.quantity >= item.wholesaleMinQty &&
          item.wholesalePrice > 0
        ) {
          appliedPrice = item.wholesalePrice;
          priceType = "Wholesale";
          saleType = "Wholesale";
        }

        const itemSubtotal = appliedPrice * si.quantity;
        subTotal += itemSubtotal;

        const lastGrn = await NewGrn.findOne({
          "items.name": si.item,
        })
          .sort({ createdAt: -1 })
          .limit(1);

        let buyingPrice = 0;
        if (lastGrn) {
          const grnItem = lastGrn.items.find(
            (g) => g.name.toString() === si.item
          );
          buyingPrice = grnItem?.buyingPrice || 0;
        }

        return {
          item: si.item,
          quantity: si.quantity,
          price: appliedPrice,
          priceType,
          buyingPrice,
          subtotal: itemSubtotal,
        };
      })
    );

    /* ===============================
       4. APPLY DISCOUNT
    =============================== */
    const safeDiscount = Math.max(0, Number(tradeDiscount) || 0);
    const totalAmount = Math.max(0, subTotal - safeDiscount);

    /* ===============================
       5. UPDATE STOCK
    =============================== */
    for (const si of soldItems) {
      await Item.findByIdAndUpdate(si.item, {
        $inc: { itemQuantity: -si.quantity },
      });
    }

    /* ===============================
       6. CUSTOMER DETAILS
    =============================== */
    const saleCustomerDetails = loyalCustomerData
      ? {
          name: loyalCustomerData.customerName,
          phone: loyalCustomerData.phone,
        }
      : customerDetails;

    /* ===============================
       7. PAYMENT LOGIC
    =============================== */
    const paidAmount = status === "Paid" ? totalAmount : 0;

    /* ===============================
       8. SAVE SALE
    =============================== */
    const sale = new Sales({
      saleType,
      items: processedItems,

      subTotal,
      tradeDiscount: safeDiscount,
      totalAmount,

      paidAmount,

      customerDetails: saleCustomerDetails,
      loyalCustomer: loyalCustomerData?._id || null,

      status,
      createdBy: req.userId,
    });

    const savedSale = await sale.save();

    return res.status(201).json({
      success: true,
      message: "Transaction successful",
      data: savedSale,
    });
  } catch (error) {
    console.error("Transaction error:", error);
    res.status(500).json({
      success: false,
      message: "Transaction failed",
    });
  }
};

// Receipt Printing
export const printReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await Sales.findById(id).populate("items.item");

    if (!sale) {
      return res.status(404).json({ success: false, message: "Sale not found" });
    }

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    
    // ====================== POLISHED COLOR PALETTE ======================
    const charcoal = '#2D3748';        // Deep charcoal for main text
    const slate = '#4A5568';           // Slate gray for secondary text
    const stone = '#718096';           // Stone gray for accents
    const smoke = '#E2E8F0';           // Light smoke for backgrounds
    const whisper = '#F7FAFC';         // Almost white for alternating rows
    const black = '#1A202C';           // Pure black for emphasis
    
    let y = 28;

    // === ELEGANT HEADER ===
    doc.setFontSize(28);
    doc.setTextColor(black);
    doc.setFont("helvetica", "bold");
    doc.text("WISE STORE", 105, y, { align: "center" });
    
    doc.setFontSize(11);
    doc.setTextColor(stone);
    doc.setFont("helvetica", "normal");
    doc.text("SALES RECEIPT", 105, y + 8, { align: "center" });
    
    y += 22;

    // Subtle divider
    doc.setDrawColor(smoke);
    doc.setLineWidth(0.5);
    doc.line(25, y, 185, y);
    y += 16;

    // === RECEIPT METADATA ===
    doc.setFontSize(9.5);
    doc.setTextColor(slate);
    
    // Left column - Receipt details
    doc.text(`Receipt #${sale._id.toString().slice(-8)}`, 25, y);
    doc.text(`${new Date(sale.createdAt).toLocaleDateString('en-TZ')}`, 25, y + 5.5);
    doc.text(`${new Date(sale.createdAt).toLocaleTimeString('en-TZ', {hour: '2-digit', minute:'2-digit'})}`, 25, y + 11);
    
    // Right column - Status badge
    const status = sale.status.toUpperCase();
    doc.setFillColor(status === "BILLED" ? '#FED7D7' : '#C6F6D5'); // Subtle red/green tint
    doc.roundedRect(145, y - 2, 40, 15, 2, 2, 'F');
    doc.setTextColor(status === "BILLED" ? '#C53030' : '#276749');
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(status, 165, y + 5, { align: "center" });
    
    y += 24;

    // === CUSTOMER SECTION ===
    doc.setFontSize(9.5);
    doc.setTextColor(stone);
    doc.setFont("helvetica", "normal");
    doc.text("CUSTOMER INFORMATION", 25, y);
    
    doc.setDrawColor(smoke);
    doc.setLineWidth(0.3);
    doc.line(25, y + 1.5, 75, y + 1.5);
    
    y += 8;
    doc.setFontSize(10.5);
    doc.setTextColor(charcoal);
    doc.setFont("helvetica", "bold");
    doc.text(`${sale.customerDetails?.name || "Walk-in Customer"}`, 25, y);
    
    doc.setFontSize(9.5);
    doc.setTextColor(slate);
    doc.setFont("helvetica", "normal");
    doc.text(`${sale.customerDetails?.phone || "No contact provided"}`, 25, y + 6);
    
    y += 22;

    // === ITEMS TABLE ===
    // Table header with subtle styling
    doc.setFillColor(whisper);
    doc.rect(25, y, 160, 9, 'F');
    doc.setDrawColor(smoke);
    doc.setLineWidth(0.5);
    doc.line(25, y, 185, y);
    doc.line(25, y + 9, 185, y + 9);
    
    doc.setFontSize(10);
    doc.setTextColor(stone);
    doc.setFont("helvetica", "bold");
    doc.text("ITEM", 27, y + 6);
    doc.text("QTY", 125, y + 6);
    doc.text("PRICE", 145, y + 6, { align: "right" });
    doc.text("TOTAL", 185, y + 6, { align: "right" });
    
    y += 12;

    // Items with alternating backgrounds
    doc.setFontSize(9.5);
    doc.setTextColor(charcoal);
    doc.setFont("helvetica", "normal");
    
    sale.items.forEach((it, index) => {
      if (y > 250) {
        doc.addPage();
        y = 32;
        // Draw table header again on new page
        doc.setFillColor(whisper);
        doc.rect(25, y, 160, 9, 'F');
        doc.setDrawColor(smoke);
        doc.line(25, y, 185, y);
        doc.line(25, y + 9, 185, y + 9);
        doc.setFontSize(10);
        doc.setTextColor(stone);
        doc.setFont("helvetica", "bold");
        doc.text("ITEM", 27, y + 6);
        doc.text("QTY", 125, y + 6);
        doc.text("PRICE", 145, y + 6, { align: "right" });
        doc.text("TOTAL", 185, y + 6, { align: "right" });
        y += 12;
      }
      
      // Alternate row background
      if (index % 2 === 0) {
        doc.setFillColor(whisper);
        doc.rect(25, y - 5, 160, 8, 'F');
      }
      
      const itemTotal = it.quantity * it.price;
      
      // Item number and name
      doc.setTextColor(stone);
      doc.text(`${index + 1}.`, 27, y);
      doc.setTextColor(charcoal);
      
      // Truncate long item names
      const itemName = it.item?.name || "Item";
      const maxLength = 35;
      const displayName = itemName.length > maxLength 
        ? itemName.substring(0, maxLength - 3) + "..." 
        : itemName;
      
      doc.text(displayName, 35, y);
      
      // Quantity
      doc.text(`${it.quantity}`, 125, y);
      
      // Price and Total with currency
      doc.text(`${parseFloat(it.price).toLocaleString()}`, 145, y, { align: "right" });
      doc.text(`${parseFloat(itemTotal).toLocaleString()}`, 185, y, { align: "right" });
      
      y += 8;
    });

    // Bottom border of table
    doc.setDrawColor(smoke);
    doc.setLineWidth(0.5);
    doc.line(25, y - 3, 185, y - 3);
    
    y += 12;

    // === TOTALS SECTION ===
    doc.setFontSize(10);
    doc.setTextColor(slate);
    
    // Subtotal
    doc.text("Subtotal", 145, y);
    doc.text(`Tsh ${parseFloat(sale.subTotal).toLocaleString()}`, 185, y, { align: "right" });
    y += 7;
    
    // Discount
    doc.text("Discount", 145, y);
    doc.text(`Tsh ${parseFloat(sale.tradeDiscount).toLocaleString()}`, 185, y, { align: "right" });
    y += 12;
    
    // Divider before total
    doc.setDrawColor(smoke);
    doc.setLineWidth(0.5);
    doc.line(145, y - 3, 185, y - 3);
    
    // Total amount - emphasized
    doc.setFontSize(12);
    doc.setTextColor(black);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL", 145, y + 2);
    doc.text(`Tsh ${parseFloat(sale.totalAmount).toLocaleString()}`, 185, y + 2, { align: "right" });
    
    y += 24;

    // === PAYMENT STATUS NOTICE ===
    if (sale.status === "Billed") {
      // Subtle background box
      doc.setFillColor('#FFF5F5');
      doc.roundedRect(25, y, 160, 16, 2, 2, 'F');
      doc.setDrawColor('#FED7D7');
      doc.setLineWidth(0.3);
      doc.roundedRect(25, y, 160, 16, 2, 2, 'S');
      
      doc.setFontSize(10);
      doc.setTextColor('#C53030');
      doc.setFont("helvetica", "bold");
      doc.text("PAYMENT PENDING", 105, y + 6, { align: "center" });
      
      doc.setFontSize(9);
      doc.setTextColor('#718096');
      doc.setFont("helvetica", "normal");
      doc.text("This document is a bill notice, not a payment receipt", 105, y + 12, { align: "center" });
      
      y += 24;
    }

    // === ELEGANT FOOTER ===
    doc.setDrawColor(smoke);
    doc.setLineWidth(0.3);
    doc.line(25, 275, 185, 275);
    
    doc.setFontSize(8.5);
    doc.setTextColor(stone);
    doc.setFont("helvetica", "normal");
    doc.text("Thank you for choosing Wise Store", 105, 280, { align: "center" });
    
    doc.setFontSize(7.5);
    doc.text("wisestore.com • +255 655 664 541 • Tip Top , Manzense , Dar es Salaam, Tanzania", 105, 284, { align: "center" });
    
    doc.text(`Receipt generated: ${new Date().toLocaleString('en-TZ')}`, 105, 288, { align: "center" });

    // ====================== SAVE & SEND ======================
    // const receiptDir = path.join(process.cwd(), "receipts");
    // if (!fs.existsSync(receiptDir)) {
    //   fs.mkdirSync(receiptDir, { recursive: true });
    // }

    // const filePath = path.join(receiptDir, `${sale._id}.pdf`);
    // doc.save(filePath);

    // res.sendFile(filePath);


    // ==================  SEND DIRECTLY TO BROWSER ============
    const pdfData = doc.output("arraybuffer");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=receipt-${sale._id}.pdf`);
    res.send(Buffer.from(pdfData));

    
  } catch (error) {
    console.error("Receipt generation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate receipt",
    });
  }
};


// Get Billed Transactions
export const billedTransactions = async (req, res) => {
  try {
    const billedSales = await Sales.find({ status: "Bill" })
      .populate("items.item")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: billedSales,
    });
  } catch (error) {
    console.error("Error getting billed transactions:", error);
    res.status(500).json({
      success: false,
      message: "Could not fetch billed transactions.",
    });
  }
};

// Pay Billed Transaction
export const payBilledTransaction = async (req, res) => {
  try {
    const { paymentAmount } = req.body;

    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment amount",
      });
    }

    const transaction = await Sales.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    if (transaction.status !== "Bill") {
      return res.status(400).json({
        success: false,
        message: "Transaction already paid",
      });
    }

    const remainingBalance =
      transaction.totalAmount - transaction.paidAmount;

    if (paymentAmount > remainingBalance) {
      return res.status(400).json({
        success: false,
        message: `Payment exceeds remaining balance (${remainingBalance})`,
      });
    }

    transaction.paidAmount += paymentAmount;

    // Auto-close bill
    if (transaction.paidAmount >= transaction.totalAmount) {
      transaction.status = "Paid";
    }

    transaction.lastModifiedBy = req.userId;

    await transaction.save();

    res.status(200).json({
      success: true,
      message: "Payment recorded successfully",
      data: transaction,
    });
  } catch (error) {
    console.error("Payment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update payment",
    });
  }
};


// All Transactions
export const allTransactions = async (req, res) => {
  try {
    const sales = await Sales.find({})
      .populate("items.item")
      .populate("createdBy", "firstName , lastName")
      .populate("lastModifiedBy", "firstName , lastName")
      .populate("tradeDiscount")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: sales,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch transactions" });
  }
};

// Most Sold Items
export const mostSoldItems = async (req, res) => {
  try {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const mostSold = await Sales.aggregate([
      {
        $match: {
          createdAt: { $gte: firstDay, $lte: lastDay },
          status: "Paid",
        },
      },
      { $unwind: "$items" },

      {
        $group: {
          _id: "$items.item",
          totalQuantity: { $sum: "$items.quantity" },

          // FIXED: price * quantity
          totalAmount: {
            $sum: {
              $multiply: ["$items.price", "$items.quantity"],
            },
          },
        },
      },

      {
        $lookup: {
          from: "items",
          localField: "_id",
          foreignField: "_id",
          as: "itemDetails",
        },
      },
      { $unwind: "$itemDetails" },

      {
        $project: {
          _id: 1,
          name: "$itemDetails.name",
          totalQuantity: 1,
          totalAmount: 1,
        },
      },

      { $sort: { totalQuantity: -1 } },
    ]);

    res.json(mostSold);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all Billed transactions with Loyal Customers
export const getBilledWallet = async (req, res) => {
  try {
    // Fetch all billed transactions with loyalCustomer
    const billedTransactions = await Sales.find({
      status: "Bill",
      loyalCustomer: { $ne: null }, // only where loyalCustomer exists
    })
      .populate("loyalCustomer", "customerName phone status address email")
      .populate("items.item", "name price")
      .populate("createdBy", "firstName lastName")
      .populate("lastModifiedBy", "firstName lastName")
      .sort({ createdAt: -1 });

    if (!billedTransactions || billedTransactions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No billed transactions with loyal customers found",
      });
    }

    // Group transactions by customer
    const customersMap = {};

    billedTransactions.forEach((txn) => {
      const customerId = txn.loyalCustomer._id.toString();
      if (!customersMap[customerId]) {
        customersMap[customerId] = {
          _id: customerId,
          name: txn.loyalCustomer.customerName,
          phone: txn.loyalCustomer.phone,
          address: txn.loyalCustomer.address,
          email: txn.loyalCustomer.email,
          bills: [],
        };
      }

      customersMap[customerId].bills.push({
        _id: txn._id,
        totalAmount: txn.totalAmount,
        status: txn.status,
        createdAt: txn.createdAt,
        items: txn.items.map((i) => ({
          name: i.item?.name,
          price: i.item?.price,
          quantity: i.quantity,
        })),
      });
    });

    const formattedData = Object.values(customersMap);

    res.status(200).json({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    console.error("Error fetching billed transactions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch billed transactions",
    });
  }
};
