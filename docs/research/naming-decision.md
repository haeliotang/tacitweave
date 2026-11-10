<!--
SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
SPDX-License-Identifier: CC-BY-4.0
-->
# 命名决策：保留 `+ weave` 格式

日期：2026-11-06。状态：**已确认 Tacitweave；改名迁移进行中。**
范围：`[prefix] + weave` 形式的品牌名、GitHub 仓库名、桌面 App 名与 bundle identifier。  
注意：以下是**语义与技术初筛**，不是商标、域名或法律意见。

## 1. 决策摘要

在“保留 + weave”约束下，推荐：

> **Tacitweave**  
> 中文工作名：**默织**（备选：**默纬**）

推荐 tagline：

> **Tacitweave — a local-first symbolic field for pre-verbal experience.**  
> **默织：一个本地优先的前语言经验象征空间。**

`tacit` 指“默会的、未完全说出的”，对应前语言经验；`weave` 保留编织、纹理、关系与时间感。它不指向家庭、治疗、诊断、BCI 或潜意识读取。

> 之前推荐的 `Feltweft` 不满足本轮“+ weave”约束，已降为历史备选。

## 2. 为什么不是 Familiweave

Familiweave 看起来是：

> Family + weave

第一印象会推向：

- 家庭治疗
- 家庭系统排列
- 家族史/家谱
- 伴侣/家庭关系分析
- 关系疗愈产品

项目实际研究的是：

> 个体前语言的身体—意象—关系预测模型；关系触发点不限于家庭。

`weave` 是合适的；问题在 `Famili`。  
`familiar + weave` 的读法虽然贴近，但用户不会天然这样读。

## 3. 本轮筛选标准

| 标准 | 要求 |
|---|---|
| 形式 | 必须以 `weave` 结尾 |
| 语义 | 身体、感受、意象、关系、纹理、前语言 |
| 边界 | 不指向家庭治疗、诊断、潜意识读取、BCI 读心 |
| 可发音 | 英文可读；中文有自然工作名 |
| 可搜索 | GitHub、npm、`.com` 低冲突 |
| 可迁移 | 仓库、App、Rust crate、CLI 一致 |

## 4. `+ weave` 候选检索

检索时间：2026-11-06。  
方法：GitHub repository search、npm registry、`whois`、公开 web 搜索。  
结果只是初筛；商标、社交 handle、App Store 名称仍需正式检索。

| 候选 | 语义 | GitHub | npm | `.com` | 判断 |
|---|---|---|---|---|---|
| **Tacitweave** | tacit/默会 + weave | 0 | 404 | 未注册 | **推荐** |
| Feltweave | felt sense + weave | 0 | 404 | 已注册（2015，纺织业务） | 语义好，品牌冲突 |
| Underweave | under + weave | 0 | 404 | 已注册 | 语义好，iF Design 同名项目 |
| Somaweave | soma/身体 + weave | 1 | 404 | 已注册 | 偏身体/临床，冲突 |
| Subweave | below + weave | 7 | 404 | 已注册 | `sub` 暗示潜意识 |
| Quietweave | quiet + weave | 0 | 404 | 已注册 | 温柔，域名冲突 |
| Stillweave | still + weave | 0 | 404 | 已注册 | 诗意，域名冲突 |
| Innerweave | inner + weave | 0 | 404 | 已注册 | 通用，域名冲突 |
| Bodyweave | body + weave | 0 | 404 | 已注册 | 直接，域名冲突 |
| Breathweave | breath + weave | 0 | 404 | 已注册 | 偏呼吸/wellness |
| Senseweave | sense + weave | 4 | 404 | 已注册 | 通用，已有项目 |
| Openweave | open + weave | 59 | 404 | 已注册 | 纺织/技术常用词 |
| Softweave | soft + weave | 6 | 404 | 已注册 | 面料词 |
| Slowweave | slow + weave | 0 | 404 | 已注册 | 慢时尚/手作联想 |

### Tacitweave 的具体检查

- `tacitweave.com`：`whois` 返回 `No match for domain "TACITWEAVE.COM"`；
- GitHub repository search：0；
- npm：404；
- 公开 web 搜索：没有发现同名软件/品牌；
- **未完成**：商标、社交 handle、`.org/.app`、中文商标。

### 为什么不选 Feltweave

`feltweave.com` 是已有纺织业务，域名创建于 2015 年，页面有 About/产品目录。  
即使 GitHub/npm 干净，品牌与 `.com` 冲突，不适合作为主名。

### 为什么不选 Underweave

`underweave.com` 已注册，且公开检索到 iF Design 的 UnderWeave 项目。  
语义很好，但品牌与域名冲突。

## 5. 名字分析

### Tacitweave

- `tacit`：默会的、未完全言明的；不是“隐藏内容”，而是“尚未被语言完全捕捉”。
- `weave`：编织、纬线、纹理；关系与时间在其中穿过。
- 合起来：**默会之织 / 尚未言明之纹理**。
- 不承诺读取；不诊断；不把家庭当作唯一对象。
- 适合研究项目、桌面 App、CLI、论文/协议命名。

风险：

- `tacit` 偏学术，可能被读成知识管理；
- `weave` 容易与纺织/手作品牌混淆；
- 需要 tagline 固定语义。

中文工作名：

- **默织**：可读、温和，推荐；
- **默纬**：更贴近 weft，但“纬”较生僻。

### 其他可行但不推荐

- **Feltweave**：语义最暖，但 `.com` 与纺织品牌冲突。
- **Underweave**：语义好，但域名与 iF Design 项目冲突。
- **Subweave**：短，但 `sub` 会强化“潜意识”误读。
- **Quietweave / Stillweave**：语气合适，但 `.com` 已注册。

## 6. 推荐的品牌结构

- 英文：**Tacitweave**
- 中文工作名：**默织**（备选：默纬）
- 仓库：`tacitweave`
- App：`Tacitweave`
- CLI/Rust：`tacitweave-ops`、`tacitweave-desktop`
- bundle identifier：`com.inceptless.tacitweave`
- 旧名：`Familiweave` 作为历史项目名，在 README/release notes 标注 “formerly Familiweave”

## 7. 迁移方案（确认后执行）

### Phase 0：保留与检索

- 注册 `tacitweave.com`；
- 检查 GitHub org/repo、npm、社交 handle；
- 做商标初筛（至少 USPTO/CNIPA 的相同/近似类别）；
- 确认中文名“默织”可用。

### Phase 1：仓库改名

- GitHub repo `tacitweave` → `tacitweave`；
- 本地 remote 更新；
- README、docs、badge、workflow 中的旧 URL；
- 旧 URL 由 GitHub 重定向，但需要复验 release 资产、raw 链接、外部引用。

当前非生成文件中的名称引用约 **80 个文件、204 处**（不含 `target/`、`dist/`、`node_modules/`、测试报告）；仓库改名本身约半天。

### Phase 2：App/数据标识符

- `productName`: `Tacitweave`
- identifier: `com.inceptless.tacitweave`
- Rust package/binary: `tacitweave-desktop`, `tacitweave-ops`
- 本地 SQLite / localStorage / app data path
- 图标、窗口标题、About、签名/公证、更新 manifest
- 旧数据迁移：
  - 开发数据：导出/导入即可；
  - 若保留旧 identifier，旧数据不会自动出现在新 App；
  - 当前无真实用户，优先换干净 identifier，不做长期双路径。

预计：**1–3 天工程 + 全量测试 + 重新打包**。

### Phase 3：发布

- 新版本建议 **v0.1.3**；
- 不覆盖 v0.1.1/v0.1.2 的资产；
- release notes 标注 “formerly Familiweave”；
- 重新生成 SHA256SUMS；
- 如签名凭据就绪，同时做 macOS Developer ID/公证与 Windows Authenticode。

### Phase 4：沟通

- README 第一段解释新名；
- 保留一句 “Familiweave was the working name; the research scope did not change.”；
- 旧 release 保留，避免历史链接断裂。

## 8. 风险

- **商标风险未清除**：Tacitweave 可能在某个类别已被注册；正式使用前必须做商标检索。
- **`tacit` 可能被读成知识管理**：tagline 必须明确是身体/前语言研究界面。
- **`weave` 有纺织联想**：这是可接受的双关，但需要视觉与文案避免手作品牌感。
- **bundle identifier 改名会断开旧本地数据**：当前无真实用户，成本可接受；若有测试数据，先导出。
- **GitHub 重定向不等于所有外部链接永久有效**：release 资产和第三方引用需要复验。

## 9. 执行状态

- 已确认 **Tacitweave / 默织**；
- GitHub 仓库已改名，remote 已更新为 `haeliotang/tacitweave`；
- 代码、App、bundle identifier、Rust crate、localStorage、SQLite 路径已改名；
- 版本提升到 `0.1.3`；
- **尚未创建 v0.1.3 tag 或 Release**；
- 商标检索与社交 handle 仍需在正式发布前完成。
