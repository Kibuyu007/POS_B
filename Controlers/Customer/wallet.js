


const payBill = async (req, res) => {
  const { customerId, payAmount } = req.body;

  // fetch billed items
  let bills = await Sale.find({ customerId, status: "Bill" }).sort({
    createdAt: 1,
  });

  let totalDebt = bills.reduce((acc, b) => acc + b.totalAmount, 0);

  if (payAmount >= totalDebt) {
    // mark all bills as Paid
    await Sale.updateMany({ customerId, status: "Bill" }, { status: "Paid" });
  } else {
    // select bills sequentially until reaching payAmount
    let remaining = payAmount;
    for (let bill of bills) {
      if (remaining >= bill.totalAmount) {
        await Sale.findByIdAndUpdate(bill._id, { status: "Paid" });
        remaining -= bill.totalAmount;
      }
    }
  }

  res.json({ message: "Payment processed" });
};



const withDraw = async (req, res) => {
      const { withdrawAmount, userId } = req.body;

  const record = new Deposit({
    withdrawAmount,
    createdBy: userId
  });

  await record.save();

  res.json({ message: "Withdrawal successful" });
}