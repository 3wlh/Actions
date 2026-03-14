# CNB Delete Releases Action

用于删除 CNB Release 和 Tag 的 GitHub Action。

## 功能

- 删除指定 tag（自动删除关联的 Release）
- 支持通配符匹配删除多个 tag

## 使用方法

### 删除单个 Tag

```yaml
- name: Delete Tag
  uses: 3wlh/actions/CNB/delete-releases@main
  with:
    token: ${{ secrets.TOKEN_CNB }}
    repo: owner/repo
    tag_name: "v1.0.0"
```

### 通配符匹配删除

```yaml
- name: Delete Multiple Tags
  uses: 3wlh/actions/CNB/delete-releases@main
  with:
    token: ${{ secrets.TOKEN_CNB }}
    repo: owner/repo
    tag_name: "v1.*"
```

## 输入参数

| 参数       | 描述                         | 必填 | 默认值                 |
| ---------- | ---------------------------- | ---- | ---------------------- |
| `token`    | CNB Personal Access Token    | ✅   | -                      |
| `repo`     | 仓库名称，格式：`owner/repo` | ❌   | `github.repository`    |
| `tag_name` | 标签名，支持 `*` 通配符      | ✅   | -                      |
| `api_url`  | CNB API 地址                 | ❌   | `https://api.cnb.cool` |

## 输出参数

| 参数               | 描述                            |
| ------------------ | ------------------------------- |
| `deleted_releases` | 已删除的 Release 标签 JSON 数组 |
| `deleted_tags`     | 已删除的 Tag 名称 JSON 数组     |

## License

MIT
