# Actions

GitHub Action 可复用工作流，用于删除工作流运行记录和重置提交历史。

## 功能

| 功能           | 说明                             |
| -------------- | -------------------------------- |
| 删除工作流运行 | 删除匹配指定模式的工作流运行记录 |
| 重置提交历史   | 创建孤儿分支，清除所有提交历史   |

## 使用方法

```yaml
name: Actions Repository Auto Cleanup

on:
  push:
    branches: [main, master]
  workflow_dispatch:
    inputs:
      runs:
        description: "删除工作流运行"
        type: boolean
        default: false
      commits:
        description: "重置提交历史"
        type: boolean
        default: false

jobs:
  cleanup:
    uses: 3wlh/Actions/.github/workflows/Call_Actions.yml@main
    with:
      auto: ${{ true }}
      manual: ${{ inputs.runs || false }}
      commits: ${{ inputs.commits || false }}
```

## 输入参数

| 参数      | 类型    | 默认值 | 说明                   |
| --------- | ------- | ------ | ---------------------- |
| `runs`    | boolean | `true` | 是否删除工作流运行记录 |
| `commits` | boolean | -      | 是否重置提交历史       |

## 权限要求

```yaml
permissions:
  contents: write
  actions: write
```

## 环境变量

| 变量             | 说明                 | 默认值                 |
| ---------------- | -------------------- | ---------------------- |
| `COMMIT_MESSAGE` | 重置提交时的提交信息 | `Reset commit history` |

## 工作流运行删除配置

当前配置删除匹配 `Pages|pages` 模式的工作流运行：

- 保留最近 30 天内每天最多 0 条运行记录
- 最少保留 0 条运行记录

## 注意事项

- 重置提交历史会**永久删除**所有提交记录，请谨慎使用
- 确保分支没有开启保护规则
- 建议在执行前备份重要数据
