import express from 'express';
import { getCRMItems, createCRMItem, updateCRMItem, deleteCRMItem, updateCRMItemOrder } from '../controllers/crmController';

const router = express.Router();

router.get('/', getCRMItems);
router.post('/', createCRMItem);
router.put('/order', updateCRMItemOrder); // Need to define this before /:id so it doesn't match id
router.put('/:id', updateCRMItem);
router.delete('/:id', deleteCRMItem);

export default router;
