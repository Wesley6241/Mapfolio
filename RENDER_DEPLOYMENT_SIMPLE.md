# Render 部署指南（使用现有 Mapfolio 仓库）

## ✅ 已完成的准备工作

你的 `Mapfolio` 仓库已经包含了所有必要的部署文件：
- ✅ `app.py` - Flask 应用（已暴露 `app` 变量）
- ✅ `requirements.txt` - Python 依赖
- ✅ `Procfile` - 启动命令：`gunicorn app:app`
- ✅ `runtime.txt` - Python 版本：3.11.7
- ✅ `.gitignore` - 已配置（uploads 文件夹会被忽略）
- ✅ Health 端点：`/health` 返回 `{"ok": true}`

## 🚀 部署步骤（超简单）

### 1. 确保代码已推送到 GitHub

你的代码应该已经在：https://github.com/Wesley6241/Mapfolio

如果没有，运行：
```bash
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

### 2. 在 Render 上创建 Web Service

1. 访问 [Render.com](https://render.com) 并登录（使用 GitHub 账号）

2. 点击 **New +** → **Web Service**

3. 选择你的仓库：**Wesley6241/Mapfolio**

4. 配置以下设置：

   **基本信息：**
   - **Name**: `mapfolio` (或你喜欢的名称)
   - **Environment**: `Python 3`
   - **Region**: 选择最近的区域（如 Singapore）

   **构建和启动：**
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`

   ⚠️ **重要**：Render 会自动检测 `Procfile`，但确保 Start Command 是 `gunicorn app:app`

5. 点击 **Create Web Service**

### 3. 等待部署完成

- Render 会自动从 GitHub 拉取代码
- 安装依赖（约 1-2 分钟）
- 启动应用
- 提供 HTTPS URL（例如：`https://mapfolio.onrender.com`）

### 4. 验证部署

访问健康检查端点：
```
https://your-app-name.onrender.com/health
```

应该返回：
```json
{"ok": true}
```

## 📝 注意事项

1. **免费计划**：
   - 应用在 15 分钟无活动后会休眠
   - 首次请求可能需要几秒钟唤醒
   - 每月有使用时间限制

2. **数据库**：
   - SQLite 数据库会在首次运行时自动创建
   - 数据会持久保存在 Render 的文件系统中

3. **上传文件**：
   - `static/uploads/` 文件夹会在应用启动时自动创建
   - 上传的文件会保存在 Render 的文件系统中

4. **自动部署**：
   - 每次推送到 GitHub 的 `main` 分支，Render 会自动重新部署

## 🎉 完成！

部署完成后，你的应用就可以通过 Render 提供的 URL 访问了！
