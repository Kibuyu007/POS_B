import express from 'express'
import { addPo, getPo } from '../../Controlers/Manunuzi/manunuziHold.js'


const router = express.Router()

router.post('/addPo', addPo)
router.get('/getPo', getPo)


export default router