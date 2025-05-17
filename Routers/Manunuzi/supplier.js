import express from 'express'
import { addSupplier, getAllSuppliers, searchSupplier, supplierStatus, updateSupplier } from '../../Controlers/Manunuzi/supplier.js'




const router = express.Router()



router.post('/addSupplier', addSupplier) 
router.get('/getSuppliers', getAllSuppliers)
router.put('/updateSupplier/:id',updateSupplier)
router.get('/searchSupplier', searchSupplier)
router.put('/status/:id',supplierStatus)



export default router