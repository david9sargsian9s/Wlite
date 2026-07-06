import { UserModel } from "../model/userModel";
import { productModel } from "../model/productModel";
import { tokenModel } from "../model/tokenModel";

export interface IModels {
    users: typeof UserModel;
    products: typeof productModel;
    token: typeof tokenModel;
}