import Sales from "../../Models/Transactions/sales.js";
import Item from "../../Models/Items/items.js";

import { jsPDF } from "jspdf";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Utility to generate the PDF
const generatePDF = async (items, totalAmount, customerDetails) => {
  const pdf = new jsPDF();
  pdf.setFont("helvetica", "bold");

  // Title
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(20, 10, 60, 10, 1, 1, "F");
  pdf.setTextColor(40, 40, 40);
  pdf.setFontSize(12);
  pdf.text("Payment Receipt", 22, 17);

  // Customer Info
  const detailsGrid = [
    { label: "Date:", value: new Date().toLocaleDateString(), xPos: 20, yPos: 30 },
    { label: "Customer:", value: customerDetails.name, xPos: 70, yPos: 30 },
    { label: "Phone:", value: customerDetails.phone, xPos: 120, yPos: 30 },
  ];

  for (const { label, xPos, yPos, value } of detailsGrid) {
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(xPos, yPos, 50, 10, 1, 1, "F");
    pdf.setTextColor(80, 80, 80);
    pdf.text(`${label} ${value}`, xPos + 2, yPos + 7);
  }

  // Table Headers
  pdf.setFillColor(200, 220, 255);
  pdf.rect(20, 50, 170, 10, "F");
  pdf.setTextColor(40, 40, 40);
  pdf.setFontSize(10);
  pdf.text("Item", 25, 57);
  pdf.text("Quantity", 90, 57);
  pdf.text("Price", 160, 57, { align: "right" });

  // Table Content
  let yPos = 65;
  pdf.rect(20, yPos, 170, items.length * 10 + 5);

  for (const item of items) {
    const soldItem = await Item.findById(item.item).exec();
    if (soldItem) {
      pdf.setTextColor(40, 40, 40);
      pdf.text(String(soldItem.name), 25, yPos + 5);
      pdf.text(String(item.quantity), 90, yPos + 5);
      pdf.text(item.price.toLocaleString(), 160, yPos + 5, { align: "right" });
      yPos += 10;
    }
  }

  // Totals and VAT
  pdf.setFontSize(10);
  pdf.text("VAT: 1.8%", 20, yPos + 20);
  pdf.text("Taxes: -%", 20, yPos + 25);
  const formattedTotal = totalAmount.toLocaleString();
  pdf.text(`Total Amount: ${formattedTotal}`, 20, yPos + 30);

  // Final Amount
  pdf.setFillColor(181, 203, 212);
  pdf.roundedRect(20, yPos + 40, 80, 10, 2, 2, "F");
  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text(`Total Amount: ${formattedTotal}`, 22, yPos + 47);

  return pdf.output("arraybuffer");
};

// Save transaction and optionally a PDF
export const storeTransaction = async (req, res) => {
  try {
    const { items: soldItems, totalAmount, customerDetails, status } = req.body;

    for (const soldItem of soldItems) {
      const item = await Item.findById(soldItem.item);
      if (!item) {
        return res.status(404).json({ success: false, message: "Item not found" });
      }
      if (item.itemQuantity < soldItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for item: ${item.name}. Available: ${item.itemQuantity}, requested: ${soldItem.quantity}`,
        });
      }
    }

    for (const soldItem of soldItems) {
      const item = await Item.findById(soldItem.item);
      item.itemQuantity = Math.max(0, item.itemQuantity - soldItem.quantity);
      await item.save();
    }

    const newSale = new Sales({
      items: soldItems,
      totalAmount,
      customerDetails,
      status,
    });

    const savedSale = await newSale.save();

    // Optional: Save PDF to disk
    const pdfBuffer = await generatePDF(soldItems, totalAmount, customerDetails);

    const dir = path.join(__dirname, "pdfs");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    const pdfFilePath = path.join(dir, `Payment_Receipt_${savedSale._id}.pdf`);
    fs.writeFileSync(pdfFilePath, Buffer.from(new Uint8Array(pdfBuffer)));

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

// Serve receipt PDF on request
export const generateReceipt = async (req, res) => {
    try {
      const { transactionId } = req.params;
  
      const sale = await Sales.findById(transactionId).lean();
      if (!sale) {
        return res.status(404).json({ success: false, message: "Transaction not found" });
      }
  
      const pdfContent = await generatePDF(sale.items, sale.totalAmount, sale.customerDetails);
      const buffer = Buffer.from(new Uint8Array(pdfContent));
  
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename=receipt_${transactionId}.pdf`);
      res.send(buffer);
    } catch (error) {
      console.error("Error generating receipt PDF:", error);
      res.status(500).send("Could not generate receipt");
    }
  };
  
