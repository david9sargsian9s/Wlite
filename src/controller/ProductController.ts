import { Request, Response } from 'express';

class ProductController {
    async createProduct(req : Request, res : Response) {
        try {
            const CProudct = await req.app.locals.services.products.createProduct(req.body);

            res.status(200).set({
                'content-type' : 'application/json',
                'Cache-Control' : 'max-age=70',
            }).json({ CProudct });
        } catch (error : unknown) {
            if (error instanceof Error) {
                return res.status(400).json({ error: error.message });
            }
            res.status(400).json({ error : error })
        }
    }

    async updateProduct(req : Request, res : Response) {
        try {
            if(!req.product) {
                return res.status(401).json({ error : "Product is not defined." })
            }

            const Pid = req.product.id;

            const UProduct = await req.app.locals.services.products.updateProduct(Pid, req.body);

            res.status(200).set({
                'content-type' : 'application/json',
                'Cache-Control' : 'max-age=70'
            }).json({ UProduct });
        } catch (error : unknown) {
            if (error instanceof Error) {
                return res.status(400).json({ error: error.message });
            }
            res.status(400).json({ error : error })
        }
    }

    async deleteProduct(req : Request, res : Response) {
        try {
            if (!req.product) {
                return res.status(400).json({ error : "Product is not defined." })
            }

            const Pid = req.product.id;

            const deleted = await req.app.locals.services.products.deleteProduct(Pid);

            res.status(200).json({ deleted })
        } catch (error : unknown) {
            if (error instanceof Error) {
                return res.status(400).json({ error: error.message });
            }
            res.status(400).json({ error : error })
        }
    }
}

export default ProductController;