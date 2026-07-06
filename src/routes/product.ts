import express from 'express';
import ProductController from '../controller/ProductController';
import loadProduct from '../middlewares/loadProduct';
import { checkPermission } from '../middlewares/ckeckPermission';

const router = express.Router();
const product = new ProductController();

/* POST product. */
router.post('/api/products', checkPermission('create', 'product'), product.createProduct);

/* PATCH to update product. */
router.patch("/api/product/:id", checkPermission('update', 'product'), loadProduct, product.updateProduct);

/* DELETE to delete product. */
router.delete('/api/product/:id', checkPermission('delete', 'product'), loadProduct, product.deleteProduct);

export default router;