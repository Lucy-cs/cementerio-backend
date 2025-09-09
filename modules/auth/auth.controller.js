// modules/auth/auth.controller.js
const svc = require("./auth.service");
const { signAccessToken } = require("../../utils/jwt");

exports.login = async (req, res) => {
  try {
    const correo = String(req.body.correo || "").trim();
    const password = String(req.body.password || "");
    if (!correo || !password) return res.status(400).json({ message: "correo y password son obligatorios." });

    const user = await svc.getActiveUserByCorreo(correo);
    if (!user) return res.status(401).json({ message: "Credenciales inválidas." });

    const ok = await svc.comparePassword(password, user.password);
    if (!ok) return res.status(401).json({ message: "Credenciales inválidas." });

    const access = signAccessToken(user);
    const rt = await svc.issueRefreshToken(user.id);

    return res.json({
      token_type: "Bearer",
      access_token: access.token,
      expires_in: access.expiresInSec,
      refresh_token: rt.raw,
      user: {
        id: user.id,
        nombre_completo: user.nombre_completo,
        correo: user.correo,
        rol_id: user.rol_id,
        rol: user.rol_nombre || null,
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Error en login", error: err.message });
  }
};

exports.refresh = async (req, res) => {
  try {
    const refreshToken = String(req.body.refresh_token || "");
    if (!refreshToken) return res.status(400).json({ message: "refresh_token es obligatorio." });

    const { user, rotated } = await svc.rotateRefreshToken(refreshToken);
    if (!user) return res.status(401).json({ message: "Refresh token inválido o expirado." });

    const access = signAccessToken(user);
    return res.json({
      token_type: "Bearer",
      access_token: access.token,
      expires_in: access.expiresInSec,
      refresh_token: rotated.raw,
      user: {
        id: user.id,
        nombre_completo: user.nombre_completo,
        correo: user.correo,
        rol_id: user.rol_id,
        rol: user.rol_nombre || null,
      }
    });
  } catch (err) {
    const isAuth = /inválido|expirado|revocado/i.test(err.message || "");
    res.status(isAuth ? 401 : 500).json({ message: isAuth ? err.message : "Error en refresh", error: err.message });
  }
};

exports.logout = async (req, res) => {
  try {
    const refreshToken = req.body?.refresh_token;
    const allDevices = req.body?.allDevices === true;

    if (allDevices) {
      // Necesita estar autenticado para revocar TODO
      const sub = req.auth?.sub;
      if (!sub) return res.status(401).json({ message: "No autorizado." });
      await svc.revokeAllForUser(sub);
      return res.status(204).send();
    }

    if (!refreshToken) return res.status(400).json({ message: "Debe enviar refresh_token o allDevices:true." });
    await svc.revokeOne(refreshToken);
    return res.status(204).send();
  } catch (err) {
    const isAuth = /no autorizado/i.test(err.message || "");
    res.status(isAuth ? 401 : 500).json({ message: "Error en logout", error: err.message });
  }
};

exports.me = async (req, res) => {
  try {
    const sub = req.auth?.sub;
    if (!sub) return res.status(401).json({ message: "No autorizado." });
    const user = await svc.getUserById(sub);
    if (!user) return res.status(401).json({ message: "No autorizado." });
    res.json({
      id: user.id,
      nombre_completo: user.nombre_completo,
      correo: user.correo,
      rol_id: user.rol_id,
      rol: user.rol_nombre || null,
      activo: user.activo
    });
  } catch (err) {
    res.status(500).json({ message: "Error en /me", error: err.message });
  }
};
