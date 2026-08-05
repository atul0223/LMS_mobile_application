import jwt from "jsonwebtoken";
const generateJWT = (user, time) => {
  const userId =
    typeof user === "string" ? user : user?._id?.toString?.() || user?.toString?.();
  if (!userId) {
    throw new Error("Unable to generate JWT: missing user id");
  }

  return jwt.sign(
    {
      id: userId,
    },
    process.env.JWT_SECRET,
    { expiresIn: time }
  );
};
export default generateJWT;
