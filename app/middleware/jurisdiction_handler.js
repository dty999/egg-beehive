'use strict';

module.exports = (option, app) => {
  const context = app.createAnonymousContext();

  return async function(ctx, next) {
    try {
      // 如果是非api请求则跳过验证
      if (!(/^\/api\//.test(ctx.request.url))) {
        await next();
        return;
      }
      const action = ctx.request.method.toLowerCase();
      const url = ctx.request.url.replace(/\?.*/g, '');
      const Permissions = await app.redis.hgetall(ctx.helper.redisKeys.permissionsBaseActionUrl(action, url));
      // 1. 确认当前请求是否在资源中，如果不在，则返回404，如果存在则根据资源状态处理
      // 2. 资源存在, 状态为0，则返回404
      if (!(Permissions.state === '1')) {
        ctx.helper.body.NOT_FOUND({ ctx, status: 404 });
      } else {
        if (Permissions.authentication === '1') { // 3. 资源存在，需要认证
          if (app.config.verification_mode === 'jwt') { // 如果认证模式为jwt
            const token = ctx.request.headers.authorization && ctx.request.headers.authorization.split('Bearer ')[ 1 ];
            if (!token) return ctx.helper.body.UNAUTHORIZED({ ctx });
            if (await app.redis.exists(token) === 1) return ctx.helper.body.UNAUTHORIZED({ ctx });
            const decoded = await ctx.app.jwt.verify(token, ctx.app.config.jwt.secret);
            ctx.currentRequestData = decoded.data;
            // 如果所剩时间小于 3小时 刷新jwt
            if ((decoded.exp * 1000 - Date.now()) / 1000 < 60 * 60 * 3) {
              ctx.set('Authorization', await ctx.helper.tools.apply(ctx, decoded.data, app.config.jwt_exp));
            }
          } else if (app.config.verification_mode === 'session') { // 如果认证模式为session
            if (ctx.session && ctx.session.currentRequestData) {
              ctx.currentRequestData = ctx.session.currentRequestData;
            } else {
              ctx.helper.body.UNAUTHORIZED({ ctx });
              return;
            }
          } else {
            ctx.helper.body.UNAUTHORIZED({ ctx });
            return;
          }
          if (Permissions.authorization === '1') { // 4. 资源存在，需要鉴权
            // redis获取当前用户的所有角色id
            let roleIds = await app.redis.smembers(ctx.helper.redisKeys.userRoleIdsBaseUserId(ctx.currentRequestData.userInfo.id));
            // 如果为空，则到数据库中获取, 并写入redis中
            if (!roleIds.length) roleIds = await context.service.userRoles.getUserRoleIds({ user_id: ctx.currentRequestData.userInfo.id });
            const userPermissions = await app.redis.sunion(roleIds.map(id => ctx.helper.redisKeys.rolePermissionsBaseRoleId(id)));
            const Permissions = userPermissions.filter(e => e === `${ action }_${ url }`);
            Permissions.length > 0 ? await next() : ctx.helper.body.FORBIDDEN({ ctx });
          } else {
            await next();
          }
        } else {
          await next();
        }
      }
    } catch (err) {
      app.emit('error', err, this);
      ctx.helper.body.UNAUTHORIZED({ ctx, msg: err.message });
      // throw err;
    }
  };
};