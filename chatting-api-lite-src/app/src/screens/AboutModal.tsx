import { Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useChatContext } from '../context/ChatContext';

interface Props { visible: boolean; onClose: () => void; }

export function AboutModal({ visible, onClose }: Props) {
  const { colors } = useChatContext();

  const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: colors.bg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12, backgroundColor: colors.bgHeader, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    title: { fontSize: 20, fontWeight: '700', color: colors.text },
    closeBtn: { fontSize: 16, color: colors.accent },
    body: { flex: 1, padding: 20 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 10 },
    text: { fontSize: 15, color: colors.text, lineHeight: 24 },
    textSecondary: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
    link: { fontSize: 14, color: colors.accent, lineHeight: 22, textDecorationLine: 'underline' as const },
    badge: { alignSelf: 'flex-start', backgroundColor: colors.accent + '20', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 16 },
    badgeText: { fontSize: 13, color: colors.accent, fontWeight: '600' },
    warningBox: { backgroundColor: colors.accent + '12', borderRadius: 10, padding: 14, borderLeftWidth: 3, borderLeftColor: colors.accent },
    bullet: { fontSize: 14, color: colors.text, lineHeight: 24, fontWeight: '600' as const },
  });

  return (
    <Modal visible={visible} animationType="slide">
      <View style={s.overlay}>
        <View style={s.header}>
          <Text style={s.title}>关于与说明</Text>
          <TouchableOpacity onPress={onClose}><Text style={s.closeBtn}>关闭</Text></TouchableOpacity>
        </View>
        <ScrollView style={s.body} showsVerticalScrollIndicator={false}>

          {/* 版本 */}
          <View style={s.section}>
            <View style={s.badge}><Text style={s.badgeText}>v0.0.1 · chatting-api-lite</Text></View>
            <Text style={s.text}>闲聊 (Chatting) 是一个纯 API 客户端，刻意简化界面，只保留对话的核心功能。本版本 (chatting-api-lite) 为 API 分支版本，不支持本地模型加载。{"\n\n"}开发者：wx{"\n"}开源协议：Apache 2.0</Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://github.com/wxen/chatting')}>
              <Text style={s.link}>GitHub: github.com/wxen/chatting</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL('https://gitee.com/fruit-whisperer/app')}>
              <Text style={s.link}>Gitee: gitee.com/fruit-whisperer/app</Text>
            </TouchableOpacity>
          </View>

          {/* 使用说明 */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>使用说明</Text>

            <Text style={s.bullet}>一、准备工作</Text>
            <Text style={s.textSecondary}>
              本应用本身不提供对话服务，需要您从模型服务商获取一个「API Key」（可以理解为访问密钥）。{"\n"}
              支持的厂商包括 DeepSeek、OpenAI、Claude、Gemini、豆包（字节）、Kimi（月之暗面）、MiniMax、通义千问（阿里）等。{"\n"}
              各家的申请地址：{"\n"}
              · DeepSeek: platform.deepseek.com{"\n"}
              · OpenAI: platform.openai.com{"\n"}
              · Claude: console.anthropic.com{"\n"}
              · Gemini: aistudio.google.com{"\n"}
              · 豆包: console.volcengine.com{"\n"}
              · Kimi: platform.moonshot.cn{"\n"}
              · 通义千问: dashscope.aliyun.com{"\n"}
              申请后通常会得到一个以 sk- 开头的字符串，这就是 API Key。
            </Text>

            <Text style={[s.bullet, { marginTop: 16 }]}>二、第一次使用（3 步开始对话）</Text>
            <Text style={s.textSecondary}>
              ① 点击右上角 ⚙️ 进入「全局设置」→ 在下方「新建 API 配置」中选择服务商，填入 API Key，点击「保存为新配置」。{"\n"}
              ② 返回主页，点击右下角绿色 ➕ 按钮，输入对话标题和头像，点击「开始」。{"\n"}
              ③ 在输入框打字，点击「发送」即可对话。{"\n\n"}
              （如果提示未配置 API Key，请检查步骤①是否正确保存。保存成功的配置会出现在设置页顶部列表中。）
            </Text>

            <Text style={[s.bullet, { marginTop: 16 }]}>三、核心功能介绍</Text>
            <Text style={s.textSecondary}>
              【全局设置 ⚙️】与【会话设置 ☰】{"\n"}
              全局设置在主页右上角齿轮图标，影响所有对话；会话设置在对话内右上角三条杠图标，只影响当前这一个对话。{"\n\n"}
              【多 API 同时请求】{"\n"}
              在会话设置中，可以勾选多个 API 配置。发送一条消息后，应用会依次向每个 API 发送请求，每个回复独立显示并标注来源（如 "via 我的 DeepSeek"）。不同 API 之间不会互相看到对方的回复。{"\n\n"}
              【系统提示词】{"\n"}
              可以预设一段指令让模型遵守（如"你是专业翻译"）。支持「####正文####」占位标记，该标记会在发送时自动替换为您输入的问题内容。触发总结：当对话即将超出模型上下文限制时，自动让模型总结当前对话要点，作为下一次对话的「记忆」延续下去。{"\n\n"}
              【消息操作 · 长按】{"\n"}
              长按任意聊天气泡弹出菜单：编辑（修改已发内容）、复制（复制到剪贴板）、引用（将消息以标签形式插入输入框）、多选（批量选择消息）、删除（占位替代或彻底清除）。{"\n\n"}
              【会话操作 · 右滑/长按】{"\n"}
              在主页会话列表上：右滑会话条可快捷编辑/置顶/标记未读/删除；长按会话条可拖拽调整顺序。{"\n\n"}
              【重新生成 · 版本切换】{"\n"}
              每条助手回复右下角有 ↻ 图标，点击可让模型重新回答同一问题。多次重新生成的内容会保留为不同「版本」，通过 ◀ ▶ 箭头切换查看。{"\n\n"}
              【强制终止】{"\n"}
              模型返回内容期间，发送按钮变为红色「终止」按钮，点击可立即停止接收回复，已接收内容保留。{"\n\n"}
              【主题切换】{"\n"}
              全局设置 → 系统 UI → 可选「跟随系统」「浅色」「深色」。首次安装默认跟随手机系统。{"\n\n"}
              【思考过程】{"\n"}
              部分模型（如 DeepSeek V4、Claude Opus）会在回答前进行推理思考。会话设置中开启「显示思考过程」后，可在气泡下方点击展开查看模型的推理链。{"\n\n"}
              【内容溢出策略】{"\n"}
              会话设置中可配置当对话内容接近模型上限时的处理方式：{"\n"}
              · 滚动刷新：旧内容自然被覆盖，不做特殊处理{"\n"}
              · 预设/自定义提示词：自动请求模型总结对话主旨，以维持连续性{"\n"}
              临界 Token 数控制触发总结的时机，引用转译字符长度控制引用消息时的文本截取长度。
            </Text>

            <Text style={[s.bullet, { marginTop: 16 }]}>四、Token 是什么？</Text>
            <Text style={s.textSecondary}>
              Token 是模型处理文本的最小单位。一个中文字约占 0.7 个 Token，一个英文单词约占 1.3 个 Token。每个 API 配置中的 Max Tokens 控制单次回复的最大长度。会话设置中可开启「显示系统信息」查看每条消息的 Token 消耗和响应速度。
            </Text>

            <Text style={[s.bullet, { marginTop: 16 }]}>五、数据存储</Text>
            <Text style={s.textSecondary}>
              所有对话记录、API 配置、提示词设置均存储在您的手机本地，不会上传至任何第三方服务器。卸载应用将清除所有数据。
            </Text>
          </View>

          {/* 隐私与免责 */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>隐私与免责</Text>
            <View style={s.warningBox}>
              <Text style={[s.textSecondary, { color: colors.text }]}>
                ⚠️ 隐私提示：{"\n"}
                本应用无第三方服务器，但您发送的消息会直接传输至所选模型厂商的 API 接口。请勿在对话中输入身份证号、银行卡、密码等敏感个人信息。{"\n\n"}
                ⚖️ 免责声明：{"\n"}
                1. 本应用是模型服务商的第三方 API 客户端，与各模型厂商无直接关联。{"\n"}
                2. 未通过其他现有项目构建，如有雷同纯属巧合。{"\n"}
                3. 本开源应用未主动发行任何商业版本。{"\n"}
                4. 使用者须遵守所选模型服务商的使用条款与所在地法律法规。{"\n"}
                5. 若将本应用用于任何违法行为，与开发者及开源作者无关，一切后果由使用者自行承担。{"\n"}
                6. 模型生成的内容不代表开发者立场。{"\n"}
                7. 本应用按「原样」提供，不附带任何明示或暗示的担保。
              </Text>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}
