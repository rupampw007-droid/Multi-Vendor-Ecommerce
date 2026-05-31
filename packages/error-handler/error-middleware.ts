import { AppError } from "./index";
import {NextFunction, Request, Response} from 'express'

export const errorMiddleWare = (err: Error, req: Request, res: Response, next: NextFunction) => {
    if(err instanceof AppError) {   //Checks those errors which are created by me in the AppError
        console.log(`Error ${req.method} ${req.url} ${err.message}`)

        return res.status(err.statusCode).json({
            status : "error",
            message : err.message,
            ... (err.details && {details : err.details})
        })
    }
    console.log("Unhandled Error: ", err)  //Checks the errors which are not in the AppError
    return res.status(500).json({
        message: " went wrong please try again!"
    })
}