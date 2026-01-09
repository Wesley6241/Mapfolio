# Render 数据库持久化配置指南

## 问题说明

默认情况下，Render 的免费计划使用临时文件系统（ephemeral filesystem），这意味着：
- 每次部署或重启后，数据库文件会丢失
- 数据无法持久保存

## 解决方案

使用环境变量 `DATABASE_PATH` 将数据库文件保存到 Render 的持久化存储路径。

## 配置步骤

### 方法1：使用 Render 的持久化磁盘（推荐）

1. **在 Render Dashboard 中创建持久化磁盘**：
   - 进入你的 Web Service
   - 点击 **"Disks"** 标签
   - 点击 **"Add Disk"**
   - 设置：
     - **Name**: `data`（或你喜欢的名称）
     - **Mount Path**: `/opt/render/project/src/data`
     - **Size**: 1GB（免费计划足够）

2. **设置环境变量**：
   - 在 Web Service 的 **"Environment"** 标签中
   - 点击 **"Add Environment Variable"**
   - 添加：
     - **Key**: `DATABASE_PATH`
     - **Value**: `/opt/render/project/src/data/archive.db`

3. **重新部署**：
   - Render 会自动检测环境变量变化并重新部署
   - 或者手动点击 **"Manual Deploy"** → **"Deploy latest commit"**

### 方法2：使用项目根目录（简单但不推荐）

如果不想创建持久化磁盘，可以使用项目根目录（但数据可能在重启时丢失）：

1. **设置环境变量**：
   - **Key**: `DATABASE_PATH`
   - **Value**: `/opt/render/project/src/archive.db`

⚠️ **注意**：此方法在 Render 免费计划上可能仍然会丢失数据，因为文件系统是临时的。

## 验证配置

部署后，检查日志确认数据库路径：

```bash
# 在 Render Dashboard 的 Logs 中查看
# 应该看到数据库文件在指定路径创建
```

## 数据迁移（如果需要）

如果你已经有本地数据库文件需要迁移：

1. **备份本地数据库**：
   ```bash
   # 在本地项目目录
   cp archive.db archive.db.backup
   ```

2. **使用 Render Shell 上传**：
   - 在 Render Dashboard 中，进入你的 Web Service
   - 点击 **"Shell"** 标签
   - 运行以下命令：
     ```bash
     # 创建数据目录（如果使用持久化磁盘）
     mkdir -p /opt/render/project/src/data
     
     # 使用 scp 或 Render 的文件上传功能
     # 将本地 archive.db 上传到服务器
     ```

3. **或者使用数据库导出/导入**：
   - 在本地导出数据为 SQL：
     ```bash
     sqlite3 archive.db .dump > backup.sql
     ```
   - 在 Render Shell 中导入：
     ```bash
     sqlite3 /opt/render/project/src/data/archive.db < backup.sql
     ```

## 备份策略

虽然持久化磁盘可以保存数据，但建议定期备份：

1. **手动备份**：
   - 定期从 Render Shell 下载数据库文件
   - 或使用 Render 的备份功能（如果可用）

2. **自动备份脚本**（可选）：
   - 可以创建一个定时任务，定期备份数据库到云存储（如 AWS S3）

## 故障排除

### 问题：数据库仍然丢失

**可能原因**：
- 环境变量未正确设置
- 持久化磁盘未正确挂载
- 路径权限问题

**解决方法**：
1. 检查环境变量是否正确设置
2. 检查 Render Logs 中的错误信息
3. 确认持久化磁盘已正确挂载

### 问题：权限错误

**解决方法**：
- 确保数据库目录有写权限
- 代码已自动创建目录，如果仍有问题，检查 Render 的权限设置

## 注意事项

1. **免费计划限制**：
   - Render 免费计划有使用时间限制
   - 应用在15分钟无活动后会休眠
   - 持久化磁盘在免费计划中可用，但容量有限

2. **数据库大小**：
   - SQLite 适合中小型应用
   - 如果数据量很大（> 1GB），考虑迁移到 PostgreSQL

3. **并发限制**：
   - SQLite 不适合高并发写入
   - 如果预期有大量并发用户，考虑使用 PostgreSQL

## 下一步

配置完成后：
1. 测试应用功能，确认数据可以保存
2. 添加一些测试数据
3. 重启应用，验证数据是否持久化
4. 如果一切正常，你的数据就不会再丢失了！
