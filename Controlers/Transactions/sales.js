import Sales from "../../Models/Transactions/sales.js";
import Item from "../../Models/Items/items.js";

import { jsPDF } from "jspdf";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to generate PDF
const generatePDF = async (items, totalAmount, customerDetails) => {
  const pdf = new jsPDF();

  // Header
  pdf.setFont("helvetica", "bold");
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(20, 10, 40, 10, 1, 1, "F");
  pdf.setTextColor(40, 40, 40);
  pdf.setFontSize(12);
  pdf.text("Payment Receipt", 22, 27);

  // Customer & Date Details
  const detailsGrid = [
    {
      label: "Date:",
      value: new Date().toLocaleDateString(),
      xPos: 20,
      yPos: 40,
    },
    { label: "Customer:", value: customerDetails.name, xPos: 70, yPos: 40 },
    { label: "Phone:", value: customerDetails.phone, xPos: 120, yPos: 40 },
  ];

  detailsGrid.forEach(({ label, value, xPos, yPos }) => {
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(xPos, yPos, 40, 10, 1, 1, "F");
    pdf.setTextColor(80, 80, 80);
    pdf.text(`${label} ${value}`, xPos + 2, yPos + 7);
  });

  // Table Header
  pdf.setFillColor(200, 220, 255);
  pdf.rect(20, 60, 170, 10, "F");
  pdf.setTextColor(40, 40, 40);
  pdf.setFontSize(10);
  pdf.text("Item", 25, 65);
  pdf.text("Quantity", 90, 65);
  pdf.text("Price", 160, 65, { align: "right" });

  // Table Content
  let yPos = 75;

  for (const item of items) {
    const soldItem = await Item.findById(item.item).exec();
    if (soldItem) {
      pdf.setTextColor(40, 40, 40);
      pdf.text(String(soldItem.name), 25, yPos);
      pdf.text(String(item.quantity), 90, yPos);
      const formattedPrice = item.price.toLocaleString();
      pdf.text(formattedPrice, 160, yPos, { align: "right" });
      yPos += 10;
    }
  }

  // VAT, Taxes, Total
  pdf.setFontSize(10);
  pdf.text("VAT: 1.8%", 20, yPos + 10);
  pdf.text("Taxes: -%", 20, yPos + 15);

  const formattedTotalAmount = totalAmount.toLocaleString();
  pdf.text(`Total Amount: ${formattedTotalAmount}`, 20, yPos + 20);

  // Highlight Total Box
  pdf.setFillColor(181, 203, 212);
  pdf.roundedRect(20, yPos + 30, 60, 10, 2, 2, "F");
  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text(`Total Amount: ${formattedTotalAmount}`, 22, yPos + 37);

  return pdf.output();
};

// Store Transaction
export const storeTransaction = async (req, res) => {
  try {
    const { items: soldItems, totalAmount, customerDetails, status } = req.body;

    // Validate Stock
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

    // Update Stock
    for (const soldItem of soldItems) {
      const item = await Item.findById(soldItem.item);
      item.itemQuantity = Math.max(0, item.itemQuantity - soldItem.quantity);
      await item.save();
    }

    // Save Transaction
    const newSale = new Sales({
      items: soldItems,
      totalAmount,
      customerDetails,
      status,
      createdBy: req.userId,
    });

    // Generate PDF receipt
    const pdfContent = await generatePDF(
      soldItems,
      totalAmount,
      customerDetails
    );

    // Save the PDF in your preferred way (e.g., as a file)
    const pdfFilePath = path.join(
      __dirname,
      "pdfs/Payment_Receipt_receipt.pdf"
    );
    fs.writeFileSync(pdfFilePath, pdfContent);

    const savedSale = await newSale.save();

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
    const { items, totalAmount, customerDetails } = req.body;

    const pdfContent = await generatePDF(items, totalAmount, customerDetails);
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



//Most Sold Items
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
        }
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.item", //from object id of the item
          totalQuantity: { $sum: "$items.quantity" },
          totalAmount: { $sum: "$items.price" },
        }
      },
      {
        $lookup: {
          from: "items",
          localField: "_id",
          foreignField: "_id",
          as: "itemDetails"
        }
      },
      { $unwind: "$itemDetails" },
      {
        $project: {
          _id: 1,
          name: "$itemDetails.name",
          totalQuantity: 1,
          totalAmount: 1, 
        }
      },
      { $sort: { totalQuantity: -1 } }
    ]);

    res.json(mostSold);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

