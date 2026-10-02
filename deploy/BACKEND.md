# 服务端部署、备份与回退

## 运行布局

- 原有 NEXT 域名和 Nginx 静态站点保持不变，新增 `/api/` 反向代理。
- 独立 Compose 项目 `next-backend`，独立 PostgreSQL 卷、网络、数据库密码。数据库无公网端口，API 只绑定宿主机 `127.0.0.1:3101`（容器内 3001，避开简历站的宿主机 3001）。
- API 使用非 root 用户、只读文件系统、移除 capabilities、不挂 Docker socket；内存 256 MB。数据库上限 512 MB。
- `/opt/next-backend/.env` 和 Compose 配置由 root 管理，不随 CI 覆盖；密码不进仓库。
- `/opt/next/releases/<SHA>/dist` 为前端；`backend` 为编译后的 API 和维护程序。Nginx 只服务 dist，不暴露后端文件。
- 发布账号仍为 `next-deploy`。只允许通过 sudo 调用 root 持有的固定激活脚本，不加入 docker 组，也不授予通用 sudo。

## 首次上线（root，已有 Docker Compose 与 NEXT 静态部署）

把本目录脚本上传到 `/opt/next-setup/backend`，先执行：

```bash
bash /opt/next-setup/backend/setup-backend.sh next.ganzhibin.icu
install -m 755 /opt/next-setup/backend/remote-activate.sh /usr/local/bin/next-activate
```

注意也要上传本仓库最新的 `remote-activate.sh`。随后通过现有 GitHub Actions 发布代码。发布包会携带已验证的 backend，先备份、迁移、启动 API、检查健康，再原子切换前端。

首次 API 健康后初始化管理员并启用代理：

```bash
bash /opt/next-setup/backend/bootstrap-production.sh
bash /opt/next-setup/backend/enable-api.sh next.ganzhibin.icu
```

首次上线推荐先上传完整发布包到 `/opt/next/incoming/<SHA>.tar.gz`，由 next-deploy 执行 `/usr/local/bin/next-activate <SHA> --prepare-backend`，只准备 API 而不切换前端。初始化账号、启用代理后，再通过 CI 或普通激活命令切换前端。`bootstrap-production.sh` 只在账号表为空时创建首个 admin；随机密码在 `/opt/next-backend/admin-bootstrap.env`，权限 600，永不打印到 CI 日志。首次登录后在「用户与权限」修改密码。此文件是初始化凭据，并不会跟随后台改密更新，改密后请安全保管或删除旧文件。

`enable-api.sh` 会备份且只修改指定 NEXT 域名配置，先检查 API 健康与 Nginx 语法，再 reload。不会停止共享 Nginx，不修改 catbuddy 或简历站。

## 持续部署

GitHub Actions：安装依赖 → 前端单测 → PostgreSQL 集成测试 → 后端类型检查 / 编译 → 前端构建 → 原有 E2E → 服务端完整流程 E2E → 打包 → 独立 SSH 账号同步 → 后端备份 / 迁移 / 健康检查 → 前端切换 → 公网校验。

API 由 Node.js 22 基础镜像运行构建产物，无须在服务器 npm install。镜像主要版本固定；重跑 setup 会拉取当前次版本，升级镜像前应先验证。常规发布不会 pull 或重新启动其他项目的容器。API 单实例更新会有短暂重启，前台静态资源不下线；它不是零停机多副本系统。

## 备份与恢复

```bash
# 每次发布自动备份；也可随时手动执行
/usr/local/bin/next-backup
# 恢复必须写明确认参数；只接受指定备份目录内文件
/usr/local/bin/next-restore /opt/next-backend/backups/next-时间戳.dump --confirm-replace-next-database
```

备份包含管理员密码摘要、会话、内容和反馈，是敏感文件，目录权限 700、文件 600。脚本不自动删除旧备份，也未配置异地同步；请定期复制到异机并监控磁盘。当前没有每日定时备份，只在发布前和手动执行时备份。需要定期备份可由维护者加入现有服务器备份系统。

恢复前再备份当前数据，只暂停 NEXT API，使用 pg_restore 单事务恢复，完成后撤销所有会话并重新启动 API。旧版程序回退与数据库恢复是两个动作：不能为了代码回退自动覆盖运营新数据。

## 账号恢复与诊断

```bash
/usr/local/bin/next-admin-password reset-password
# 交互输入账号和新密码，不回显；会撤销此账号所有会话
docker compose --env-file /opt/next-backend/.env -f /opt/next-backend/compose.yml ps
docker compose --env-file /opt/next-backend/.env -f /opt/next-backend/compose.yml logs --tail 100 api
curl --fail http://127.0.0.1:3101/api/health
```

不要打印 `.env` 到日志、不要把数据库映射到公网、不要执行 `down -v`。配置只保存在服务器，重建数据库容器不会删除卷。

## 回退

新 API 的迁移或健康检查失败时，固定激活脚本会尝试恢复上一 API 目录并重新启动；前端尚未切换，因此仍保留旧版。代码发布不会自动执行逆向数据库迁移。手动整体回退：选择保留的旧 release，由 `/usr/local/bin/next-activate <旧 SHA>` 激活前后端。不要回退到不具备服务端契约的旧版而继续用新后台编辑，避免误把本地演示数据当作线上数据。

现有 TLS 证书和续期方式不在本次后端部署中更改；不要使用后台部署脚本停止共享 Nginx 申请证书。
