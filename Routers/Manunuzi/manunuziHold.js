import express from 'express'
import { addPo, getPo, updatePo } from '../../Controlers/Manunuzi/manunuziHold.js'
import { verifyUser } from '../../Middleware/verifyToken.js'


const router = express.Router()

router.post('/addPo',verifyUser, addPo)
router.put('/updatePo/:id', updatePo )
router.get('/getPo', getPo)


export default router