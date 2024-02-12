import { User } from "entities";
import { FindOptionsSelect } from "typeorm";

export const getUserSelectedColumns = ({
  userEmail,
}: {
  userEmail?: boolean;
} = {}): FindOptionsSelect<User> => {
  return {
    id: true,
    cognitoId: true,
    name: true,
    description: true,
    avatar: true,
    created_at: true,
    updated_at: true,
    deleted_at: true,
    email: userEmail,
  };
};
