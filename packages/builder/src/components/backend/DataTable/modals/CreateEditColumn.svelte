<script>
  import {
    Input,
    Button,
    Label,
    Select,
    Toggle,
    RadioGroup,
    DatePicker,
    ModalContent,
    Context,
  } from "@budibase/bbui"
  import { createEventDispatcher } from "svelte"
  import { cloneDeep } from "lodash/fp"
  import { tables } from "stores/backend"
  import { TableNames, UNEDITABLE_USER_FIELDS } from "constants"
  import {
    FIELDS,
    AUTO_COLUMN_SUB_TYPES,
    RelationshipTypes,
    ALLOWABLE_STRING_OPTIONS,
    ALLOWABLE_NUMBER_OPTIONS,
    ALLOWABLE_STRING_TYPES,
    ALLOWABLE_NUMBER_TYPES,
    SWITCHABLE_TYPES,
  } from "constants/backend"
  import { getAutoColumnInformation, buildAutoColumn } from "builderStore/utils"
  import { notifications } from "@budibase/bbui"
  import ValuesList from "components/common/ValuesList.svelte"
  import ConfirmDialog from "components/common/ConfirmDialog.svelte"
  import { truncate } from "lodash"
  import ModalBindableInput from "components/common/bindings/ModalBindableInput.svelte"
  import { getBindings } from "components/backend/DataTable/formula"
  import { getContext } from "svelte"

  const AUTO_TYPE = "auto"
  const FORMULA_TYPE = FIELDS.FORMULA.type
  const LINK_TYPE = FIELDS.LINK.type
  const STRING_TYPE = FIELDS.STRING.type
  const NUMBER_TYPE = FIELDS.NUMBER.type

  const dispatch = createEventDispatcher()
  const PROHIBITED_COLUMN_NAMES = ["type", "_id", "_rev", "tableId"]
  const { hide } = getContext(Context.Modal)
  let fieldDefinitions = cloneDeep(FIELDS)

  export let field = {
    type: "string",
    constraints: fieldDefinitions.STRING.constraints,

    // Initial value for column name in other table for linked records
    fieldName: $tables.selected.name,
  }

  let originalName = field.name
  const linkEditDisabled = originalName != null
  let primaryDisplay =
    $tables.selected.primaryDisplay == null ||
    $tables.selected.primaryDisplay === field.name

  let table = $tables.selected
  let indexes = [...($tables.selected.indexes || [])]
  let confirmDeleteDialog
  let deletion

  $: checkConstraints(field)
  $: required = !!field?.constraints?.presence || primaryDisplay
  $: uneditable =
    $tables.selected?._id === TableNames.USERS &&
    UNEDITABLE_USER_FIELDS.includes(field.name)
  $: invalid =
    !field.name ||
    (field.type === LINK_TYPE && !field.tableId) ||
    Object.keys($tables.draft?.schema ?? {}).some(
      key => key !== originalName && key === field.name
    ) ||
    columnNameInvalid
  $: columnNameInvalid = PROHIBITED_COLUMN_NAMES.some(
    name => field.name === name
  )

  // used to select what different options can be displayed for column type
  $: canBeSearched =
    field.type !== LINK_TYPE &&
    field.subtype !== AUTO_COLUMN_SUB_TYPES.CREATED_BY &&
    field.subtype !== AUTO_COLUMN_SUB_TYPES.UPDATED_BY &&
    field.type !== FORMULA_TYPE
  $: canBeDisplay = field.type !== LINK_TYPE && field.type !== AUTO_TYPE
  $: canBeRequired =
    field.type !== LINK_TYPE && !uneditable && field.type !== AUTO_TYPE
  $: relationshipOptions = getRelationshipOptions(field)
  $: external = table.type === "external"
  // in the case of internal tables the sourceId will just be undefined
  $: tableOptions = $tables.list.filter(
    opt =>
      opt._id !== $tables.draft._id &&
      opt.type === table.type &&
      table.sourceId === opt.sourceId
  )
  $: typeEnabled =
    !originalName ||
    (originalName && SWITCHABLE_TYPES.indexOf(field.type) !== -1)

  async function saveColumn() {
    if (field.type === AUTO_TYPE) {
      field = buildAutoColumn($tables.draft.name, field.name, field.subtype)
    }
    await tables.saveField({
      originalName,
      field,
      primaryDisplay,
      indexes,
    })
    dispatch("updatecolumns")
  }

  function deleteColumn() {
    if (field.name === $tables.selected.primaryDisplay) {
      notifications.error("You cannot delete the display column")
    } else {
      tables.deleteField(field)
      notifications.success(`Column ${field.name} deleted.`)
      confirmDeleteDialog.hide()
      hide()
      deletion = false
    }
    dispatch("updatecolumns")
  }

  function handleTypeChange(event) {
    // remove any extra fields that may not be related to this type
    delete field.autocolumn
    delete field.subtype
    delete field.tableId
    delete field.relationshipType

    // Add in defaults and initial definition
    const definition = fieldDefinitions[event.detail?.toUpperCase()]
    if (definition?.constraints) {
      field.constraints = definition.constraints
    }

    // Default relationships many to many
    if (field.type === LINK_TYPE) {
      field.relationshipType = RelationshipTypes.MANY_TO_MANY
    }
  }

  function onChangeRequired(e) {
    const req = e.detail
    field.constraints.presence = req ? { allowEmpty: false } : false
    required = req
  }

  function onChangePrimaryDisplay(e) {
    const isPrimary = e.detail
    // primary display is always required
    if (isPrimary) {
      field.constraints.presence = { allowEmpty: false }
    }
  }

  function onChangePrimaryIndex(e) {
    indexes = e.detail ? [field.name] : []
  }

  function onChangeSecondaryIndex(e) {
    if (e.detail) {
      indexes[1] = field.name
    } else {
      indexes = indexes.slice(0, 1)
    }
  }

  function confirmDelete() {
    confirmDeleteDialog.show()
    deletion = true
  }

  function hideDeleteDialog() {
    confirmDeleteDialog.hide()
    deletion = false
  }

  function getRelationshipOptions(field) {
    if (!field || !field.tableId) {
      return null
    }
    const linkTable = tableOptions?.find(table => table._id === field.tableId)
    if (!linkTable) {
      return null
    }
    const thisName = truncate(table.name, { length: 14 }),
      linkName = truncate(linkTable.name, { length: 14 })
    return [
      {
        name: `Many ${thisName} rows → many ${linkName} rows`,
        alt: `Many ${table.name} rows → many ${linkTable.name} rows`,
        value: RelationshipTypes.MANY_TO_MANY,
      },
      {
        name: `One ${linkName} row → many ${thisName} rows`,
        alt: `One ${linkTable.name} rows → many ${table.name} rows`,
        value: RelationshipTypes.ONE_TO_MANY,
      },
      {
        name: `One ${thisName} row → many ${linkName} rows`,
        alt: `One ${table.name} rows → many ${linkTable.name} rows`,
        value: RelationshipTypes.MANY_TO_ONE,
      },
    ]
  }

  function getAllowedTypes() {
    if (originalName && ALLOWABLE_STRING_TYPES.indexOf(field.type) !== -1) {
      return ALLOWABLE_STRING_OPTIONS
    } else if (
      originalName &&
      ALLOWABLE_NUMBER_TYPES.indexOf(field.type) !== -1
    ) {
      return ALLOWABLE_NUMBER_OPTIONS
    } else if (!external) {
      return [
        ...Object.values(fieldDefinitions),
        { name: "Auto Column", type: AUTO_TYPE },
      ]
    } else {
      return [
        FIELDS.STRING,
        FIELDS.LONGFORM,
        FIELDS.OPTIONS,
        FIELDS.DATETIME,
        FIELDS.NUMBER,
        FIELDS.BOOLEAN,
        FIELDS.ARRAY,
        FIELDS.FORMULA,
        FIELDS.LINK,
      ]
    }
  }

  function checkConstraints(fieldToCheck) {
    // most types need this, just make sure its always present
    if (fieldToCheck && !fieldToCheck.constraints) {
      fieldToCheck.constraints = {}
    }
    // some string types may have been built by server, may not always have constraints
    if (fieldToCheck.type === STRING_TYPE && !fieldToCheck.constraints.length) {
      fieldToCheck.constraints.length = {}
    }
    // some number types made server-side will be missing constraints
    if (
      fieldToCheck.type === NUMBER_TYPE &&
      !fieldToCheck.constraints.numericality
    ) {
      fieldToCheck.constraints.numericality = {}
    }
  }
</script>

<ModalContent
  title={originalName ? "Edit Column" : "Create Column"}
  confirmText="Save Column"
  onConfirm={saveColumn}
  disabled={invalid}
>
  <Input
    label="Name"
    bind:value={field.name}
    disabled={uneditable || (linkEditDisabled && field.type === LINK_TYPE)}
    error={columnNameInvalid
      ? `${PROHIBITED_COLUMN_NAMES.join(", ")} are not allowed as column names`
      : ""}
  />

  <Select
    disabled={!typeEnabled}
    label="Type"
    bind:value={field.type}
    on:change={handleTypeChange}
    options={getAllowedTypes()}
    getOptionLabel={field => field.name}
    getOptionValue={field => field.type}
  />

  {#if canBeRequired || canBeDisplay}
    <div>
      {#if canBeRequired}
        <Toggle
          value={required}
          on:change={onChangeRequired}
          disabled={primaryDisplay}
          thin
          text="Required"
        />
      {/if}
      {#if canBeDisplay}
        <Toggle
          bind:value={primaryDisplay}
          on:change={onChangePrimaryDisplay}
          thin
          text="Use as table display column"
        />
      {/if}
    </div>
  {/if}

  {#if canBeSearched && !external}
    <div>
      <Label grey small>Search Indexes</Label>
      <Toggle
        value={indexes[0] === field.name}
        disabled={indexes[1] === field.name}
        on:change={onChangePrimaryIndex}
        text="Primary"
      />
      <Toggle
        value={indexes[1] === field.name}
        disabled={!indexes[0] || indexes[0] === field.name}
        on:change={onChangeSecondaryIndex}
        text="Secondary"
      />
    </div>
  {/if}

  {#if field.type === "string"}
    <Input
      type="number"
      label="Max Length"
      bind:value={field.constraints.length.maximum}
    />
  {:else if field.type === "options"}
    <ValuesList
      label="Options (one per line)"
      bind:values={field.constraints.inclusion}
    />
  {:else if field.type === "array"}
    <ValuesList
      label="Options (one per line)"
      bind:values={field.constraints.inclusion}
    />
  {:else if field.type === "datetime"}
    <DatePicker
      label="Earliest"
      bind:value={field.constraints.datetime.earliest}
    />
    <DatePicker label="Latest" bind:value={field.constraints.datetime.latest} />
  {:else if field.type === "number"}
    <Input
      type="number"
      label="Min Value"
      bind:value={field.constraints.numericality.greaterThanOrEqualTo}
    />
    <Input
      type="number"
      label="Max Value"
      bind:value={field.constraints.numericality.lessThanOrEqualTo}
    />
  {:else if field.type === "link"}
    <Select
      label="Table"
      disabled={linkEditDisabled}
      bind:value={field.tableId}
      options={tableOptions}
      getOptionLabel={table => table.name}
      getOptionValue={table => table._id}
    />
    {#if relationshipOptions && relationshipOptions.length > 0}
      <RadioGroup
        disabled={linkEditDisabled}
        label="Define the relationship"
        bind:value={field.relationshipType}
        options={relationshipOptions}
        getOptionLabel={option => option.name}
        getOptionValue={option => option.value}
      />
    {/if}
    <Input
      disabled={linkEditDisabled}
      label={`Column name in other table`}
      bind:value={field.fieldName}
    />
  {:else if field.type === FORMULA_TYPE}
    <ModalBindableInput
      title="Handlebars Formula"
      label="Formula"
      value={field.formula}
      on:change={e => (field.formula = e.detail)}
      bindings={getBindings({ table })}
      serverSide="true"
    />
  {:else if field.type === AUTO_TYPE}
    <Select
      label="Auto Column Type"
      value={field.subtype}
      on:change={e => (field.subtype = e.detail)}
      options={Object.entries(getAutoColumnInformation())}
      getOptionLabel={option => option[1].name}
      getOptionValue={option => option[0]}
    />
  {/if}

  <div slot="footer">
    {#if !uneditable && originalName != null}
      <Button warning text on:click={confirmDelete}>Delete</Button>
    {/if}
  </div>
</ModalContent>
<ConfirmDialog
  bind:this={confirmDeleteDialog}
  body={`Are you sure you wish to delete this column? Your data will be deleted and this action cannot be undone.`}
  okText="Delete Column"
  onOk={deleteColumn}
  onCancel={hideDeleteDialog}
  title="Confirm Deletion"
/>
