import Debt from "../../Models/Debts/debts.js";



// Create Debts
export const createDebt = async (req, res) => {
   try {
    const { customerName, phone, totalAmount } = req.body;

    const debt = await Debt.create({
      customerName,
      phone,
      totalAmount,
      remainingAmount: totalAmount
    });

    res.json(debt);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


  


// Get All Depts
export const getDebts = async (req, res) => {
  try {
    const debts = await Debt.find().sort({ createdAt: -1 });
    res.json(debts);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};



//Get Single Debt
export const getDebtById = async (req, res) => {
  try {
    const debt = await Debt.findById(req.params.id);
    res.json(debt);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};



// Update / Pay Debts
export const addPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    const debt = await Debt.findById(id);
    if (!debt) return res.status(404).json({ message: "Not found" });

    debt.remainingAmount -= amount;

    debt.payments.push({ amount });

    if (debt.remainingAmount <= 0) {
      debt.remainingAmount = 0;
      debt.status = "cleared";
    }

    await debt.save();
    res.json(debt);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Delete Dept
export const deleteDebt = async (req, res) => {
  try {
    await Debt.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


