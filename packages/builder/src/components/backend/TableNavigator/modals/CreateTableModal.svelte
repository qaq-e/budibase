<script>
  import { goto, url } from "@roxi/routify"
  import { store } from "builderStore"
  import { tables } from "stores/backend"
  import { notifications } from "@budibase/bbui"
  import {
    Input,
    Label,
    ModalContent,
    Toggle,
    Divider,
    Layout,
  } from "@budibase/bbui"
  import TableDataImport from "../TableDataImport.svelte"
  import analytics, { Events } from "analytics"
  import screenTemplates from "builderStore/store/screenTemplates"
  import { buildAutoColumn, getAutoColumnInformation } from "builderStore/utils"
  import { NEW_ROW_TEMPLATE } from "builderStore/store/screenTemplates/newRowScreen"
  import { ROW_DETAIL_TEMPLATE } from "builderStore/store/screenTemplates/rowDetailScreen"
  import { ROW_LIST_TEMPLATE } from "builderStore/store/screenTemplates/rowListScreen"

  const defaultScreens = [
    NEW_ROW_TEMPLATE,
    ROW_DETAIL_TEMPLATE,
    ROW_LIST_TEMPLATE,
  ]

  $: tableNames = $tables.list.map(table => table.name)

  export let name
  let dataImport
  let error = ""
  let createAutoscreens = true
  let autoColumns = getAutoColumnInformation()

  function addAutoColumns(tableName, schema) {
    for (let [subtype, col] of Object.entries(autoColumns)) {
      if (!col.enabled) {
        continue
      }
      schema[col.name] = buildAutoColumn(tableName, col.name, subtype)
    }
    return schema
  }

  function checkValid(evt) {
    const tableName = evt.target.value
    if (tableNames.includes(tableName)) {
      error = `Table with name ${tableName} already exists. Please choose another name.`
      return
    }
    error = ""
  }

  async function saveTable() {
    let newTable = {
      name,
      schema: addAutoColumns(name, dataImport.schema || {}),
      dataImport,
    }

    // Only set primary display if defined
    if (dataImport.primaryDisplay && dataImport.primaryDisplay.length) {
      newTable.primaryDisplay = dataImport.primaryDisplay
    }

    // Create table
    const table = await tables.save(newTable)
    notifications.success(`Table ${name} created successfully.`)
    analytics.captureEvent(Events.TABLE.CREATED, { name })

    // Create auto screens
    if (createAutoscreens) {
      const screens = screenTemplates($store, [table])
        .filter(template => defaultScreens.includes(template.id))
        .map(template => template.create())
      for (let screen of screens) {
        // Record the table that created this screen so we can link it later
        screen.autoTableId = table._id
        await store.actions.screens.create(screen)
      }

      // Create autolink to newly created list screen
      const listScreen = screens.find(screen =>
        screen.props._instanceName.endsWith("List")
      )
      await store.actions.components.links.save(
        listScreen.routing.route,
        table.name
      )
    }

    // Navigate to new table
    const currentUrl = $url()
    const path = currentUrl.endsWith("data")
      ? `./table/${table._id}`
      : `../../table/${table._id}`
    $goto(path)
  }
</script>

<ModalContent
  title="Create Table"
  confirmText="Create"
  onConfirm={saveTable}
  disabled={error || !name || (dataImport && !dataImport.valid)}
>
  <Input
    data-cy="table-name-input"
    thin
    label="Table Name"
    on:input={checkValid}
    bind:value={name}
    {error}
  />
  <div class="autocolumns">
    <Label extraSmall grey>Auto Columns</Label>
    <div class="toggles">
      <div class="toggle-1">
        <Toggle text="Created by" bind:value={autoColumns.createdBy.enabled} />
        <Toggle text="Created at" bind:value={autoColumns.createdAt.enabled} />
        <Toggle text="Auto ID" bind:value={autoColumns.autoID.enabled} />
      </div>
      <div class="toggle-2">
        <Toggle text="Updated by" bind:value={autoColumns.updatedBy.enabled} />
        <Toggle text="Updated at" bind:value={autoColumns.updatedAt.enabled} />
      </div>
    </div>
    <Divider />
  </div>
  <Toggle
    text="Generate screens in Design section"
    bind:value={createAutoscreens}
  />
  <div>
    <Layout gap="XS" noPadding>
      <Label grey extraSmall>Create Table from CSV (Optional)</Label>
      <TableDataImport bind:dataImport />
    </Layout>
  </div>
</ModalContent>

<style>
  .autocolumns {
    margin-bottom: -10px;
  }

  .toggles {
    display: flex;
    width: 100%;
    margin-top: 6px;
  }

  .toggle-1 :global(> *) {
    margin-bottom: 10px;
  }

  .toggle-2 :global(> *) {
    margin-bottom: 10px;
    margin-left: 20px;
  }
</style>
