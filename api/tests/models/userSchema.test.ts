import { randomUUID } from "crypto";
import { User } from "../../src/models/user";

describe("User schema", () => {
  it("defaults access arrays to empty and isAdmin to false", () => {
    const user = new User({
      publicId: randomUUID(),
      email: "newuser@test.com",
      username: "newuser",
      password: "hashed-password",
    });

    expect(user.validateSync()).toBeUndefined();
    expect(user.accessServersArray).toEqual([]);
    expect(user.accessPagesArray).toEqual([]);
    expect(user.isAdmin).toBe(false);
  });
});
