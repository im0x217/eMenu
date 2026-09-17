const express = require('express');

module.exports = function createAuthRouter(context) {
  const router = express.Router();
  const { 
    SESSION_TOKEN_SHOP1, SESSION_TOKEN_SHOP2, ADMIN_USER, ADMIN_PASS,
    verifyCustomerPassword, hashCustomerPassword,
    loginLimiter, checkAdmin, checkMongoDB 
  } = context;

router.post("/api/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "اسم المستخدم وكلمة المرور مطلوبان" });
  }

  // 1. Search database users
  if (context.mongoConnected) {
    try {
      const user = await context.adminUsersCollection.findOne({ username: username.trim() });
      if (user) {
        const isMatch = verifyCustomerPassword(password.trim(), user.passwordHash, user.password);
        if (isMatch) {
          // Transparently upgrade legacy plain password to PBKDF2 hash
          if (!user.passwordHash) {
            await context.adminUsersCollection.updateOne(
              { _id: user._id },
              { 
                $set: { passwordHash: hashCustomerPassword(password.trim()) },
                $unset: { password: "" }
              }
            ).catch(err => console.error("Password migration error:", err));
          }
          const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
          res.cookie("admin_session", SESSION_TOKEN_SHOP1, { httpOnly: true, sameSite: "Lax", secure: isSecure, signed: true, path: "/" });
          return res.json({ 
            success: true, 
            token: SESSION_TOKEN_SHOP1,
            role: user.role || "admin",
            name: user.name || user.username,
            shopAccess: user.shopAccess || "all"
          });
        }
      }
    } catch (e) {
      console.error("Login DB check error:", e);
    }
  }

  // 2. Fallback ENV check
  if (username.trim() === ADMIN_USER && password.trim() === ADMIN_PASS) {
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie("admin_session", SESSION_TOKEN_SHOP1, { httpOnly: true, sameSite: "Lax", secure: isSecure, signed: true, path: "/" });
    return res.json({ success: true, token: SESSION_TOKEN_SHOP1, role: "admin", name: "المدير العام", shopAccess: "all" });
  }

  res.status(401).json({ success: false, message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
});

router.get("/api/admin-check", checkAdmin, (req, res) => {
  res.json({ ok: true });
});

router.post("/api/logout", (req, res) => {
  res.clearCookie("admin_session", { path: "/" });
  res.clearCookie("admin_session_shop2", { path: "/" });
  res.clearCookie("admin", { path: "/" });
  res.clearCookie("admin_shop2", { path: "/" });
  res.json({ success: true });
});

// Public endpoint to list available admin/staff user accounts for login dropdown selector
router.get("/api/public/admin-users", async (req, res) => {
  try {
    let users = [];
    if (context.mongoConnected && context.adminUsersCollection) {
      users = await context.adminUsersCollection.find({}, { projection: { username: 1, name: 1, role: 1 } }).sort({ name: 1 }).toArray();
    }
    if (!users || users.length === 0) {
      users = [{ username: ADMIN_USER, name: "المدير العام", role: "admin" }];
    }
    res.json({ success: true, users });
  } catch (err) {
    console.error("Public admin users fetch error:", err);
    res.json({ success: true, users: [{ username: ADMIN_USER, name: "المدير العام", role: "admin" }] });
  }
});

// ============ PRODUCTS API ============
router.post("/api/shop2/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "اسم المستخدم وكلمة المرور مطلوبان" });
  }

  // 1. Search database users
  if (context.mongoConnected) {
    try {
      const user = await context.adminUsersCollection.findOne({ username: username.trim() });
      if (user) {
        const isMatch = verifyCustomerPassword(password.trim(), user.passwordHash, user.password);
        if (isMatch) {
          // Transparently upgrade legacy plain password to PBKDF2 hash
          if (!user.passwordHash) {
            await context.adminUsersCollection.updateOne(
              { _id: user._id },
              { 
                $set: { passwordHash: hashCustomerPassword(password.trim()) },
                $unset: { password: "" }
              }
            ).catch(err => console.error("Password migration error:", err));
          }
          const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
          res.cookie("admin_session_shop2", SESSION_TOKEN_SHOP2, { httpOnly: true, sameSite: "Lax", secure: isSecure, signed: true, path: "/" });
          return res.json({ 
            success: true, 
            token: SESSION_TOKEN_SHOP2,
            role: user.role || "admin",
            name: user.name || user.username,
            shopAccess: user.shopAccess || "all"
          });
        }
      }
    } catch (e) {
      console.error("Shop2 Login DB check error:", e);
    }
  }

  // 2. Fallback ENV check
  if (username.trim() === ADMIN_USER && password.trim() === ADMIN_PASS) {
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie("admin_session_shop2", SESSION_TOKEN_SHOP2, { httpOnly: true, sameSite: "Lax", secure: isSecure, signed: true, path: "/" });
    return res.json({ success: true, token: SESSION_TOKEN_SHOP2, role: "admin", name: "المدير العام", shopAccess: "all" });
  }

  res.status(401).json({ success: false, message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
});

// ============ USER MANAGEMENT APIs (ADMIN ONLY) ============
router.get("/api/admin/users", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const users = await context.adminUsersCollection.find({}, { projection: { password: 0, passwordHash: 0 } }).sort({ createdAt: -1 }).toArray();
    res.json({ users });
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.post("/api/admin/users", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { name, password, role, shopAccess } = req.body;
    if (!name || !password) {
      return res.status(400).json({ error: "الاسم وكلمة المرور مطلوبان" });
    }
    const cleanName = name.trim();
    const existing = await context.adminUsersCollection.findOne({ $or: [{ name: cleanName }, { username: cleanName }] });
    if (existing) {
      return res.status(400).json({ error: "هذا الاسم مستخدم بالفعل" });
    }
    const cleanPass = password.trim();
    const newUser = {
      name: cleanName,
      username: cleanName,
      passwordHash: hashCustomerPassword(cleanPass),
      role: role === 'order_manager' ? 'order_manager' : 'admin',
      shopAccess: shopAccess || 'all',
      createdAt: new Date()
    };
    await context.adminUsersCollection.insertOne(newUser);
    delete newUser.passwordHash;
    res.json({ success: true, user: newUser });
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

router.put("/api/admin/users/:id", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, password, role, shopAccess } = req.body;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    const cleanName = name ? name.trim() : '';
    const updateData = {
      name: cleanName,
      username: cleanName,
      role: role === 'order_manager' ? 'order_manager' : 'admin',
      shopAccess: shopAccess || 'all'
    };
    let updateFields = { $set: updateData };
    if (password && password.trim().length > 0) {
      updateData.passwordHash = hashCustomerPassword(password.trim());
      updateFields.$unset = { password: "" };
    }
    await context.adminUsersCollection.updateOne({ _id: new ObjectId(id) }, updateFields);
    res.json({ success: true });
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

router.delete("/api/admin/users/:id", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    await context.adminUsersCollection.deleteOne({ _id: new ObjectId(id) });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

router.get("/api/shop2/admin-check", checkAdmin, (req, res) => {
  res.json({ ok: true });
});

// ============ ADMIN ANALYTICS API ============

  return router;
};
