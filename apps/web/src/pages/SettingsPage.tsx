import { Link } from 'react-router-dom';
import { usePreferences } from '../preferences';

type ToggleProps = {
  checked: boolean;
  onChange: (value: boolean) => void;
};

function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      className={`toggle ${checked ? 'on' : ''}`}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

export function SettingsPage() {
  const { preferences, setPreference, resetPreferences } = usePreferences();

  return (
    <div className="settings-page">
      <div className="page-head" data-reveal>
        <div>
          <p className="eyebrow"><span className="eyebrow-rule" />偏好</p>
          <h1>设置</h1>
          <p className="muted">这些选项只保存在当前浏览器，不会影响别人。</p>
        </div>
        <Link className="btn ghost sm" to="/">回到首页</Link>
      </div>

      <section className="panel settings-card" data-reveal>
        <div className="settings-row">
          <div>
            <strong>楼中楼自动展开</strong>
            <p>打开主题时，自动加载每条回复下面的楼中楼。</p>
          </div>
          <Toggle
            checked={preferences.autoExpandReplies}
            onChange={(value) => setPreference('autoExpandReplies', value)}
          />
        </div>

        <div className="settings-row">
          <div>
            <strong>夜间模式</strong>
            <p>切到深色背景，适合晚上看帖。</p>
          </div>
          <Toggle
            checked={preferences.nightMode}
            onChange={(value) => setPreference('nightMode', value)}
          />
        </div>

        <div className="settings-row">
          <div>
            <strong>减少动效</strong>
            <p>关闭金尘、墨团和大部分过渡动画，低配设备更顺滑。</p>
          </div>
          <Toggle
            checked={preferences.reduceMotion}
            onChange={(value) => setPreference('reduceMotion', value)}
          />
        </div>

        <div className="settings-row">
          <div>
            <strong>通知轮询</strong>
            <p>每 25–30 秒自动检查新通知；关闭后只在切换页面时刷新。</p>
          </div>
          <Toggle
            checked={preferences.notificationPolling}
            onChange={(value) => setPreference('notificationPolling', value)}
          />
        </div>
      </section>

      <div className="settings-foot">
        <span className="muted small">偏好保存在 localStorage，换设备不会同步。</span>
        <button className="btn ghost sm" onClick={resetPreferences}>恢复默认</button>
      </div>
    </div>
  );
}
