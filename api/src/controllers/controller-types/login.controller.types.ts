import { AdminStatus } from "../../models";

export type loginParams = {
  email: string;
  password: string;
}

export type loginResponse = {
  userId: string;
  token: string;
  verified: boolean;
  activated?: boolean;
  adminStatus?: AdminStatus;
};

export type whoAmIResponse = {
  id: string,
  firstName?: string,
  lastName?: string,
  email: string,
  role: string,
}