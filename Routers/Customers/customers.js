import express from 'express'
import { addCustomer, customerStatus, getAllCustomers, getCustomers, searchCustomer, updateCustomer } from '../../Controlers/Customer/customer.js'




const router = express.Router()



router.post('/addCustomer', addCustomer) 
router.get('/getCustomers', getCustomers)
router.get('/getAllCustomers', getAllCustomers)
router.put('/updateCustomer/:id',updateCustomer)
router.get('/searchCustomer', searchCustomer)
router.put('/status/:id',customerStatus)



export default router