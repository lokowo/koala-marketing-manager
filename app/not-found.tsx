import { OlaEmpty } from './koala/components/ola/OlaEmpty';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#080c10]">
      <OlaEmpty
        message="这个页面走丢了..."
        actionLabel="回首页"
        actionHref="/koala/home"
      />
    </div>
  );
}
