export const createOtp = async () => {
  return Math.floor(Math.random() * 900000 + 100000);
};
