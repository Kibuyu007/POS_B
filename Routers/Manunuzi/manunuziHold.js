import express from 'express'
import { addBidhaa, getAllBidhaa } from '../../Controlers/Manunuzi/manunuziHold.js'


const router = express.Router()

router.post('/addHold', addBidhaa)
router.get('/getHold', getAllBidhaa)


export default router