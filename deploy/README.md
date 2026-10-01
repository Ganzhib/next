# NEXT 部署与 CI/CD

## 设计与边界

沿用构建 → SSH 上传 → 独立站点 → HTTPS → 健康检查」流程。
本站为 Vite 静态应用，使用现有 Nginx 直接提供静态文件，不需要 Node 常驻进程、Docker 或数据库。
不停止共享 Nginx，不修改 magic-resume 的目录、域名和容器。

正式域名：`https://next.ganzhibin.icu`。日常代码发布只切换静态目录，不停止 Nginx。

### 本服务器的证书验证限制

2026-10-01 的 HTTP-01 验证请求被导向 DNSPod 拦截页面，因此首次安装经站点所有者明确批准，使用 TLS-ALPN 验证。`issue-tls-certificate.sh --maintenance-approved` 会短暂停止共享 Nginx，设置 105 秒超时、退出恢复以及 120 秒独立恢复保险；该脚本**不可放入普通 CI/CD，也没有配置自动停站续期**。

证书安装后使用 `enable-https.sh next.ganzhibin.icu --existing-cert` 绑定域名。已有 acme.sh 定时任务不能在 Nginx 占用 443 时完成此证书的 ALPN 续期，不能将其视为可用的自动续期。到期前应接入 DNS API 自动验证，或另行批准维护窗口续期；普通代码部署不受影响。

- 独立目录：`/opt/next`。
- 独立账号：`next-deploy`，无 sudo 权限，专用 SSH 密钥禁止端口转发和 PTY。
- 版本目录：`/opt/next/releases/<完整 Git SHA>/dist`。
- `current` 原子切换到新版本；本机健康检查失败时恢复上一版本。
- 历史版本和上传包保留，不自动删除；空间不足时由管理员确认清理范围。
- `/version.json` 用于校验线上版本；`/__next_version` 仅允许本机健康检查。
- React 子路由刷新回退到 `index.html`，静态资源不存在时返回 404。

**重要：IndexedDB 不是线上共享数据库。** 管理员浏览器的修改不会分发给其他访客；全站统计、统一后台权限、跨设备同步尚未接入。新访客读取代码内初始产品配置。域名、协议或端口改变会产生独立数据空间，需要手动导出、导入备份。当前继续保留 noindex，防止搜索引擎把尚未接入真实链接的页面当作正式目录。

## 首次部署

1. 为选择的子域名添加 A 记录指向目标服务器；没有 IPv6 服务时不要添加 AAAA。
2. 在本地 SSH 目录生成仅供 NEXT 使用的 ed25519 密钥，不放进仓库。
3. 将本目录脚本、Nginx 模板和**公钥**上传至独立的服务器准备目录。
4. root 执行 `bash setup-server.sh <域名> <公钥文件>`。脚本发现同名目录、站点或账号会拒绝覆盖。
5. 运行构建和测试，使用 `node deploy/package-release.mjs <完整提交 SHA>` 打包，将发布包上传至 `/opt/next/incoming/<SHA>.tar.gz`。
6. 用 `next-deploy` 执行 `/usr/local/bin/next-activate <SHA>`，验证 HTTP 版本。
7. DNS 生效且已有 certbot 账户后，root 执行 `bash enable-https.sh <域名>`。只用 webroot 验证，不停止其他网站。确认服务器 certbot 定时续期任务已经启用。
8. 配置下方 GitHub 参数，再启用自动部署。

密钥主机指纹须与已验证的服务器一致；禁止用 `StrictHostKeyChecking=no` 绕过校验。不要把私钥、服务器密码、API Token 或本地 IndexedDB 导出数据提交到公开仓库。

## GitHub Actions

PR：安装依赖 → 单元测试 → 构建 → Chromium 浏览器回归测试；不接触部署凭证。

main 推送或手动触发：同样检查 → 上传构建包 → production 环境部署 → 公网 HTTPS 版本校验。
CI 使用 rsync 校验和增量传输，在独立版本目录中复用相同插画文件，避免每次上传二十多 MB 原图；校验通过前不切换线上目录。本地 Windows 发布继续支持完整压缩包上传。
仅 `main` 可部署，同一分支任务串行执行，不中断正在发布的任务。
Actions 使用固定提交版本和只读仓库权限。

仓库 Secrets：

| 名称 | 内容 |
| --- | --- |
| DEPLOY_SSH_HOST | 目标服务器地址 |
| DEPLOY_SSH_PRIVATE_KEY | NEXT 专用私钥，不能复用其他项目的 root 密钥 |
| DEPLOY_SSH_KNOWN_HOSTS | 已验证的 SSH 主机公钥记录 |

仓库 Variables：

| 名称 | 内容 |
| --- | --- |
| PRODUCTION_DOMAIN | 完整域名，不带协议或路径 |
| DEPLOY_SSH_PORT | SSH 端口，默认 22 |
| PRODUCTION_DEPLOY_ENABLED | 初始化与证书完成后设置为 `true` |

production 环境只允许 main 分支。更改部署脚本后，需要管理员审核并更新服务器的 `/usr/local/bin/next-activate`；日常发布密钥不能修改该 root 所有的脚本。

## 本地发布与回滚

将 `deploy.config.example.json` 复制为忽略提交的 `deploy.config.json` 并填写连接信息。
提交代码后执行 `npm run deploy`。部署脚本拒绝脏工作区，确保版本可复现。

回滚：用独立账号执行 `/usr/local/bin/next-activate <历史版本 SHA>`，对应上传包和版本目录须仍存在。公网访问失败会让 CI/CD 失败，但只有本机新版本健康检查失败才自动回滚，避免把 DNS 或网络故障误判为构建故障。

实现参考：[GitHub 部署与环境文档](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments)、[Nginx try_files 文档](https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files)。
