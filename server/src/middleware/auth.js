import jwt from 'jsonwebtoken';
export function auth(req,res,next){
 const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 if(!token) return res.status(401).json({error:'Authentication required'});
 try{req.user=jwt.verify(token,process.env.JWT_SECRET); next();}
 catch{return res.status(401).json({error:'Session expired. Please sign in again.'});}
}
export const allow=(...roles)=>(req,res,next)=>roles.includes(req.user.role)?next():res.status(403).json({error:'You do not have permission to perform this action'});
