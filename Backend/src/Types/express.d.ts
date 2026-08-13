import { IUser } from "../models/userModel.ts";
import { Types } from "mongoose";

export interface IUserHydrated extends IUser {
    _id: Types.ObjectId | string;
}

declare global {
    namespace Express {
        interface Request {
            user?: IUserHydrated;
        }
    }
}
