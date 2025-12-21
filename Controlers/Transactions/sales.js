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

const generatePDF = async (items, totalAmount, customerDetails, tradeDiscount = 0) => {
  const pdf = new jsPDF();
  const width = 210;
  const margin = 20;
  let y = 20;

  // ===== HEADER =====
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(34, 139, 34); // nice green
  pdf.text("WISE STORE", margin, y);

  // Receipt # right aligned
  const receiptNo = `#${Date.now().toString().slice(-6)}`;
  pdf.setFontSize(10);
  pdf.setTextColor(120, 120, 120);
  pdf.text(`RECEIPT ${receiptNo}`, width - margin, y, { align: "right" });

  y += 10;

  // Date and time
  const now = new Date();
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(80, 80, 80);
  pdf.text(now.toLocaleDateString(), margin, y);
  pdf.text(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), width - margin, y, { align: "right" });

  y += 10;

  // ===== CUSTOMER INFO =====
  if (customerDetails.name || customerDetails.phone) {
    pdf.setFontSize(10);
    pdf.setTextColor(50);
    if (customerDetails.name) pdf.text(`Customer: ${customerDetails.name}`, margin, y);
    if (customerDetails.phone) pdf.text(`Phone: ${customerDetails.phone}`, width - margin, y, { align: "right" });
    y += 10;
  }

  // ===== ITEMS TABLE HEADER =====
  const colQty = width - margin - 65;
  const colPrice = width - margin - 40;
  const colTotal = width - margin;

  pdf.setDrawColor(180, 180, 180);
  pdf.line(margin, y - 3, width - margin, y - 3);

  y += 4;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(34, 139, 34);
  pdf.text("ITEM", margin, y);
  pdf.text("QTY", colQty, y);
  pdf.text("PRICE", colPrice, y);
  pdf.text("TOTAL", colTotal, y, { align: "right" });

  y += 7;

  // ===== ITEMS LIST =====
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(40, 40, 40);

  let subtotal = 0;

  for (const item of items) {
    const soldItem = await Item.findById(item.item).exec();
    if (!soldItem) continue;

    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;

    let itemName = soldItem.name;
    if (itemName.length > 25) itemName = itemName.substring(0, 23) + "...";

    pdf.text(itemName, margin, y);
    pdf.setTextColor(80, 80, 80);
    pdf.text(item.quantity.toString(), colQty, y);
    pdf.text(item.price.toLocaleString(), colPrice, y);
    pdf.text(itemTotal.toLocaleString(), colTotal, y, { align: "right" });

    y += 6;
  }

  y += 8;

  // ===== TOTALS =====
  const discount = Number(tradeDiscount) || 0;
  const finalTotal = subtotal - discount;

  // Divider
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, y, width - margin, y);
  y += 6;

  pdf.setFontSize(10);
  pdf.setTextColor(50);
  pdf.text("Subtotal", colPrice - 5, y);
  pdf.text(subtotal.toLocaleString(), colTotal, y, { align: "right" });

  y += 6;
  pdf.text("Discount", colPrice - 5, y);
  pdf.text(`-${discount.toLocaleString()}`, colTotal, y, { align: "right" });

  y += 8;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(34, 139, 34);
  pdf.text("TOTAL", colPrice - 5, y);
  pdf.text(finalTotal.toLocaleString(), colTotal, y, { align: "right" });

  // Underline
  y += 2;
  pdf.setDrawColor(34, 139, 34);
  pdf.line(colPrice - 5, y, colTotal, y);

  y += 12;

  // ===== FOOTER =====
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(120, 120, 120);
  pdf.text("Thank you for your business!", width / 2, y, { align: "center" });

  return pdf.output();
};



// Store Transaction
export const storeTransaction = async (req, res) => {
  try {
    const {
      items: soldItems,
      totalAmount,
      customerDetails,
      loyalCustomer,
      status,
      tradeDiscount = 0, // Default to 0 if not provided
    } = req.body;

    // -------------------------------
    // 1. Validate Stock
    // -------------------------------
    for (const soldItem of soldItems) {
      const item = await Item.findById(soldItem.item);
      if (!item) {
        return res
          .status(404)
          .json({ success: false, message: "Item not found" });
      }
      if (item.itemQuantity < soldItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for item: ${item.name}. Available: ${item.itemQuantity}, requested: ${soldItem.quantity}`,
        });
      }
    }

    // -------------------------------
    // 2. Fetch Loyal Customer (if any)
    // -------------------------------
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

    // -------------------------------
    // 3. Update Stock
    // -------------------------------
    for (const soldItem of soldItems) {
      const item = await Item.findById(soldItem.item);
      item.itemQuantity = Math.max(0, item.itemQuantity - soldItem.quantity);
      await item.save();
    }

    // 4. Determine Customer Details
    // -------------------------------
    const saleCustomerDetails = loyalCustomerData
      ? { name: loyalCustomerData.customerName, phone: loyalCustomerData.phone }
      : customerDetails;

    // 5. Fetch Buying Price from GRN
    // -------------------------------
    const itemsWithBuyingPrice = await Promise.all(
      soldItems.map(async (si) => {
        // Find latest GRN entry for this item
        const lastGrn = await NewGrn.findOne({
          "items.name": si.item,
        })
          .sort({ createdAt: -1 })
          .limit(1);

        let buyingPrice = 0;

        if (lastGrn) {
          const grnItem = lastGrn.items.find(
            (i) => i.name.toString() === si.item
          );
          buyingPrice = grnItem?.buyingPrice || 0;
        }

        return {
          ...si,
          buyingPrice,
        };
      })
    );

    // 6. Prepare Sale Data
    // -------------------------------
    const saleData = {
      items: itemsWithBuyingPrice,
      totalAmount,
      tradeDiscount: tradeDiscount || 0,
      customerDetails: saleCustomerDetails,
      status,
      loyalCustomer: loyalCustomerData ? loyalCustomerData._id : null,
      createdBy: req.userId,
    };

    // 7. Save Transaction
    // -------------------------------
    const newSale = new Sales(saleData);
    const savedSale = await newSale.save();

    // 8. Generate PDF Receipt - FIXED PARAMETER ORDER
    // -------------------------------
    const pdfContent = await generatePDF(
      itemsWithBuyingPrice,
      totalAmount,
      saleCustomerDetails, // Correct order: items, totalAmount, customerDetails, tradeDiscount
      tradeDiscount
    );

    const pdfFilePath = path.join(
      __dirname,
      "pdfs/Payment_Receipt_receipt.pdf"
    );
    fs.writeFileSync(pdfFilePath, pdfContent);

    // 9. Respond
    // -------------------------------
    res.status(201).json({
      success: true,
      message: "Transaction successful",
      data: savedSale,
    });
  } catch (error) {
    console.error("Transaction error:", error);
    res.status(500).json({ success: false, message: "Transaction failed" });
  }
};

// Generate Receipt
export const generateReceipt = async (req, res) => {
  try {
    const { items, totalAmount, customerDetails, tradeDiscount = 0 } = req.body;

    const pdfContent = await generatePDF(
      items,
      totalAmount,
      customerDetails,
      tradeDiscount
    );
    const buffer = Buffer.from(pdfContent, "binary");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=receipt.pdf");
    res.send(buffer);
  } catch (error) {
    console.error("Error generating receipt PDF:", error);
    res.status(500).send("Could not generate receipt");
  }
};

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

export const payBilledTransaction = async (req, res) => {
  try {
    const { paymentAmount } = req.body;

    const transaction = await Sales.findById(req.params.id);
    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }

    if (transaction.status !== "Bill") {
      return res
        .status(400)
        .json({ success: false, message: "Transaction already paid" });
    }

    transaction.paidAmount = (transaction.paidAmount || 0) + paymentAmount;

    // If paidAmount is equal or more than totalAmount, mark as Paid
    if (transaction.paidAmount >= transaction.totalAmount) {
      transaction.status = "Paid";
    }

    transaction.lastModifiedBy = req.userId;

    await transaction.save();

    res
      .status(200)
      .json({ success: true, message: "Payment updated", data: transaction });
  } catch (err) {
    console.error("Payment error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to update payment" });
  }
};

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
