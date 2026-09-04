import jwt from "jsonwebtoken";
const generateJWT = (user: any, time: string | number) => {
  const userId =
    typeof user === "string" ? user : user?._id?.toString?.() || user?.toString?.();
  if (!userId) {
    throw new Error("Unable to generate JWT: missing user id");
  }

  return jwt.sign(
    {
      id: userId,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: time }
  );
};
export default generateJWT;
