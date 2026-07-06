import { Request, Response, NextFunction } from "express";
import { productModel } from "../model/productModel";

async function loadProduct(req : Request, res : Response, next : NextFunction) {
    try {
        const product = await productModel.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                error : "Product not found"
            });
        }

        req.product = product;
        next();
    } catch (error) {
        return res.status(400).json({ error: "Invalid Product ID format" });
    }
}

export default loadProduct;