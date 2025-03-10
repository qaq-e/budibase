export default `
<html>
  <head>
    <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
    <link rel="preconnect" href="https://fonts.gstatic.com" />
    <link
      href="https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;600;700&display=swap"
      rel="stylesheet"
    />
    <link
      href="https://cdn.jsdelivr.net/npm/remixicon@2.5.0/fonts/remixicon.css"
      rel="stylesheet"
    />
    <style>
      html, body {
        padding: 0;
        margin: 0;
      }
      html {
        height: 100%;
        width: 100%;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: stretch;
      }
      body {
        flex: 1 1 auto;
        overflow: hidden;
      }
  
      *,
      *:before,
      *:after {
        box-sizing: border-box;
      }
    </style>
    <script src='{{ CLIENT_LIB_PATH }}'></script>
    <script>
      function receiveMessage(event) { 
        if (!event.data) {
          return
        }

        // Parse received message
        // If parsing fails, just ignore and wait for the next message
        let parsed
        try {
          parsed = JSON.parse(event.data)
        } catch (error) {
          // Ignore
        }
        if (!parsed) {
          return
        }

        // Extract data from message
        const {
          selectedComponentId,
          layout,
          screen,
          previewType,
          appId,
          theme,
          customTheme,
          previewDevice,
        } = parsed

        // Set some flags so the app knows we're in the builder
        window["##BUDIBASE_IN_BUILDER##"] = true
        window["##BUDIBASE_APP_ID##"] = appId
        window["##BUDIBASE_PREVIEW_LAYOUT##"] = layout
        window["##BUDIBASE_PREVIEW_SCREEN##"] = screen
        window["##BUDIBASE_SELECTED_COMPONENT_ID##"] = selectedComponentId
        window["##BUDIBASE_PREVIEW_ID##"] = Math.random()
        window["##BUDIBASE_PREVIEW_TYPE##"] = previewType
        window["##BUDIBASE_PREVIEW_THEME##"] = theme
        window["##BUDIBASE_PREVIEW_CUSTOM_THEME##"] = customTheme
        window["##BUDIBASE_PREVIEW_DEVICE##"] = previewDevice

        // Initialise app
        try {
          if (window.loadBudibase) {
            window.loadBudibase()
            document.documentElement.classList.add("loaded")
            window.parent.postMessage({ type: "iframe-loaded" })
          } else {
            throw "The client library couldn't be loaded"
          }
        } catch (error) {
          window.parent.postMessage({ type: "error", error })
        }
      }

      window.addEventListener("message", receiveMessage)
      window.addEventListener("keydown", evt => {
        window.parent.postMessage({ type: "keydown", key: event.key })
      })

      window.parent.postMessage({ type: "ready" })
    </script>
  </head>
  <body/>
</html>
`
