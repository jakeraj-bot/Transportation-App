export function UserThemeStyle({ css }: { css: string }) {
  return <style id="user-theme" dangerouslySetInnerHTML={{ __html: css }} />;
}
