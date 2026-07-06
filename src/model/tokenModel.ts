import { Schema, model } from 'mongoose';

interface IToken {
    refresh : string;
    userID : Schema.Types.ObjectId;
}

const tokenSchema = new Schema({
    refresh : {
        type : String,
        required : true,
    },
    userID : {
        type : Schema.Types.ObjectId,
        ref : 'users',
        required : true,
    },
});

export const tokenModel = model<IToken>('tokens', tokenSchema)