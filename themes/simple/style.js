/* eslint-disable react/no-unknown-property */
import CONFIG from './config'
import { themeConsoleStyle } from '@/lib/themeConsoleStyle'
/**
 * 此处样式只对当前主题生效
 * 此处不支持tailwindCSS的 @apply 语法
 * @returns
 */
const Style = () => {
  return <style jsx global>{`

  // 底色
  .dark body{
      background-color: black;
  }
  // 文本不可选取
    .forbid-copy {
        user-select: none;
        -webkit-user-select: none;
        -ms-user-select: none;
    }

  #theme-simple #announcement-content {
    /* background-color: #f6f6f6; */
  }

  #theme-simple .blog-item-title {
    color: #276077;
  }

  .dark #theme-simple .blog-item-title {
    color: #d1d5db;
  }

  .notion {
    margin-top: 0 !important;
    margin-bottom: 0 !important;
  }

  /* ═══ 菜谱页：做法序号连续 + 改进日志紧凑化 ═══ */
  /* 1. 做法步骤被"改进日志"toggle 打断后，序号连续递增（不再全是 1） */
  #theme-simple .notion-page {
    counter-reset: recipe-step;
  }
  #theme-simple .notion-page .notion-list-numbered {
    list-style: none;
  }
  #theme-simple .notion-page .notion-list-numbered > li {
    counter-increment: recipe-step;
    position: relative;
    padding-left: 1.7em;
  }
  #theme-simple .notion-page .notion-list-numbered > li::before {
    content: counter(recipe-step) ". ";
    position: absolute;
    left: 0;
    font-weight: 600;
  }
  /* 2. 改进日志 toggle：默认折叠成一个小图标，点开才展开，内容小字 */
  #theme-simple .notion-page .notion-toggle {
    margin: 3px 0;
  }
  #theme-simple .notion-page .notion-toggle > summary {
    font-size: 0;
    line-height: 1;
    list-style: none;
    cursor: pointer;
    padding: 3px 0;
    opacity: .55;
  }
  #theme-simple .notion-page .notion-toggle > summary::-webkit-details-marker {
    display: none;
  }
  #theme-simple .notion-page .notion-toggle > summary::before {
    content: "📝";
    font-size: 15px;
  }
  #theme-simple .notion-page .notion-toggle[open] > div {
    font-size: 13px;
    color: #8a8a8a;
  }


  /*  菜单下划线动画 */
  #theme-simple .menu-link {
      text-decoration: none;
      background-image: linear-gradient(#dd3333, #dd3333);
      background-repeat: no-repeat;
      background-position: bottom center;
      background-size: 0 2px;
      transition: background-size 100ms ease-in-out;
  }

  #theme-simple .menu-link:hover {
      background-size: 100% 2px;
      color: #dd3333;
      cursor: pointer;
  }




      ${themeConsoleStyle('simple', CONFIG)}
  `}</style>
}

export { Style }
