import express from 'express'
import { addPo, getPo, updatePo } from '../../Controlers/Manunuzi/manunuziHold.js'
import { verifyUser } from '../../Middleware/verifyToken.js'
import { createExpense, getExpenses, updateExpense } from '../../Controlers/Manunuzi/matumizi.js'



const router = express.Router()

router.post('/addPo',verifyUser, addPo)
router.put('/updatePo/:id', updatePo )
router.get('/getPo', getPo)
router.post('/matumizi',verifyUser, createExpense)
router.get('/matumiziYote',getExpenses)
router.put('/updateMatumizi/:id',verifyUser, updateExpense )


export default router