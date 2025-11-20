import express from 'express'
import { addPo, getPo, updatePo } from '../../Controlers/Manunuzi/manunuziHold.js'
import { verifyUser } from '../../Middleware/verifyToken.js'
import { createExpense, getExpenses } from '../../Controlers/Manunuzi/matumizi.js'



const router = express.Router()

router.post('/addPo',verifyUser, addPo)
router.put('/updatePo/:id', updatePo )
router.get('/getPo', getPo)
router.post('/matumizi',verifyUser, createExpense)
router.get('/matumiziYote',getExpenses)


export default router