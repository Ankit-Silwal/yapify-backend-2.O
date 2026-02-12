import REDIS_CLIENT from "../../config/redis.js";
import { generateOtp } from "../../utils/generateOtp.js";
import pool from "../../config/db.js";
import { Request,Response } from "express";

const OTP_TTL=300;

export async function generateAndStoreOtp(userId:string):Promise<string>{
  const otp=generateOtp();
  const key=`verify:otp:${userId}`;
  await REDIS_CLIENT.set(key,otp,{EX:OTP_TTL});
  return otp;
}

type verifyResponse={
  success:boolean,
  message:string
}

export async function verifyAndConsumeOtp(userId:string,submittedOtp:string):Promise<verifyResponse>{
  const key=`verify:otp:${userId}`;
  const stored=await REDIS_CLIENT.get(key);
  if(!stored){
    return({
      success:false,
      message:"Otp expired"
    })
  }

  if(stored!=submittedOtp){
    return({
      success:false,
      message:"OTP didnt match"
    })
  }

  await REDIS_CLIENT.del(key);
  const user=await pool.query(
    `Update users
    set is_verified=true
    where id=$1
    returning id,email,is_verified`
  ,[userId]);
  if(user.rowCount==0){
    return({
      success:false,
      message:"The required user doesnt exists sir"
    })
  }
  return({
    success:true,
    message:"The Otp was verified"
  })
}