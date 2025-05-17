import jwt from "jsonwebtoken";


export const verifyUser = (req, res, next) => {

    const token = req.cookies.accessToken;

        if(!token){
    
            return res.status(401).json({message: "you are not authorized.."})
        }
    
    
        jwt.verify(token, process.env.MYCODE, async (err, payload)=> {

            if(err){
               return res.status(401).json({error: "user not found......."})
            }

            console.log("Token payload: ", payload);

            req.userId = payload.id
            next()
        });
    }


    export const errorHandler = (err,req,res,next) => {

        const statusCode = err.statusCode || 500;

        return res.status(statusCode).json({
            stastus: statusCode,
            message: err.message,
           errorStack: process.env.NODE_ENV === "development" ? err.stack : ""
        })
    }