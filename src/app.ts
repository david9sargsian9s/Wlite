// export {};
import createError from 'http-errors';
import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import mongoose from 'mongoose';
import 'dotenv/config';

import path from 'path';

import usersRouter from './routes/users';
import authRouter from './routes/auth';
import productRouter from './routes/product';
import shellRouter from './routes/sh';
import ProfileRouter from './routes/profile';

import { UserModel } from './model/userModel';
import { tokenModel } from './model/tokenModel';
import { productModel } from './model/productModel';

import UserService from './service/User.service';
import ProductService from './service/Product.service';
import AuthService from './service/Auth.service';

import { IModels } from "./types/models";


const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

interface IAppLocals {
  model: IModels;

  services: {
    users: UserService;
    products: ProductService;
    auth: AuthService;
  };
}

declare module "express-serve-static-core" {
  interface Locals extends IAppLocals {}
}

app.locals.model = {
  users : UserModel,
  products : productModel,
  token : tokenModel,
}

app.locals.services = {
  users : new UserService(app.locals.model),
  products : new ProductService(app.locals.model),
  auth : new AuthService(app.locals.model),
}

const connect : any = process.env.ATLAS_URL;
mongoose.connect(connect);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// app.use(express.static(path.join(__dirname, 'public')));

app.use('/', shellRouter);
app.use('/', usersRouter);
app.use('/', authRouter);
app.use('/auth', authRouter);
app.use('/', productRouter);
app.use('/', ProfileRouter);

// catch 404 and forward to error handler
app.use(function(req : Request, res : Response, next : NextFunction) {
  next(createError(404));
});

// error handler
app.use(function(err : any, req : Request, res : Response, next : NextFunction): void {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.json({ error : err.message })
});

export default app;
