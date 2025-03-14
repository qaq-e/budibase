<script>
  import Placeholder from "../Placeholder.svelte"
  import FieldGroupFallback from "./FieldGroupFallback.svelte"
  import { getContext, onDestroy } from "svelte"

  export let label
  export let field
  export let fieldState
  export let fieldApi
  export let fieldSchema
  export let defaultValue
  export let type
  export let disabled = false
  export let validation

  // Get contexts
  const formContext = getContext("form")
  const formStepContext = getContext("form-step")
  const fieldGroupContext = getContext("field-group")
  const { styleable } = getContext("sdk")
  const component = getContext("component")

  // Register field with form
  const formApi = formContext?.formApi
  const labelPos = fieldGroupContext?.labelPosition || "above"
  const formField = formApi?.registerField(
    field,
    type,
    defaultValue,
    disabled,
    validation,
    formStepContext || 1
  )

  // Update form properties in parent component on every store change
  const unsubscribe = formField?.subscribe(value => {
    fieldState = value?.fieldState
    fieldApi = value?.fieldApi
    fieldSchema = value?.fieldSchema
  })
  onDestroy(() => unsubscribe?.())

  // Keep field state up to date with props which might change due to
  // conditional UI
  $: updateValidation(validation)
  $: updateDisabled(disabled)

  // Determine label class from position
  $: labelClass = labelPos === "above" ? "" : `spectrum-FieldLabel--${labelPos}`

  const updateValidation = validation => {
    fieldApi?.updateValidation(validation)
  }

  const updateDisabled = disabled => {
    fieldApi?.setDisabled(disabled)
  }
</script>

<FieldGroupFallback>
  <div class="spectrum-Form-item" use:styleable={$component.styles}>
    <label
      class:hidden={!label}
      for={fieldState?.fieldId}
      class={`spectrum-FieldLabel spectrum-FieldLabel--sizeM spectrum-Form-itemLabel ${labelClass}`}
    >
      {label || ""}
    </label>
    <div class="spectrum-Form-itemField">
      {#if !formContext}
        <Placeholder text="Form components need to be wrapped in a form" />
      {:else if !fieldState}
        <Placeholder
          text="Add the Field setting to start using your component"
        />
      {:else if fieldSchema?.type && fieldSchema?.type !== type && type !== "options"}
        <Placeholder
          text="This Field setting is the wrong data type for this component"
        />
      {:else}
        <slot />
        {#if fieldState.error}
          <div class="error">{fieldState.error}</div>
        {/if}
      {/if}
    </div>
  </div>
</FieldGroupFallback>

<style>
  label {
    white-space: nowrap;
  }
  label.hidden {
    padding: 0;
  }

  .spectrum-Form-itemField {
    position: relative;
    width: 100%;
  }

  .error {
    color: var(
      --spectrum-semantic-negative-color-default,
      var(--spectrum-global-color-red-500)
    );
    font-size: var(--spectrum-global-dimension-font-size-75);
    margin-top: var(--spectrum-global-dimension-size-75);
  }

  .spectrum-FieldLabel--right,
  .spectrum-FieldLabel--left {
    padding-right: var(--spectrum-global-dimension-size-200);
  }
</style>
