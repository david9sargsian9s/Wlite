import { IProduct } from "../model/productModel";
import { IModels } from "../types/models";

class ProductService {
    private model: IModels;

    constructor(model: IModels) {
        this.model = model;
    }

    async createProduct(body: IProduct): Promise<IProduct> {
        return await this.model.products.create(body);
    }

    async updateProduct(Pid : string, body : IProduct): Promise<IProduct | null> {
        return await this.model.products.findOneAndUpdate({ _id : Pid }, { $set : body }, { new : true });
    }

    async deleteProduct(Pid : string): Promise<IProduct | null> {
        return await this.model.products.findOneAndDelete({ _id : Pid });
    }
}

export default ProductService;