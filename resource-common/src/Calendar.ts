import { DateSpan, Calendar, ReducerContext } from '@fullcalendar/core'
import { ResourceApi } from './api/ResourceApi'
import { ResourceInput, parseResource, ResourceHash, Resource } from './structs/resource'


Calendar.prototype.addResource = function(this: Calendar, input: ResourceInput | ResourceApi, scrollTo = true) {
  let resourceHash: ResourceHash
  let resource: Resource

  if (input instanceof ResourceApi) {
    resource = input._resource
    resourceHash = { [resource.id]: resource }
  } else {
    resourceHash = {}
    resource = parseResource(input, '', resourceHash, this.state)
  }

  this.state.dispatch({
    type: 'ADD_RESOURCE',
    resourceHash
  })

  if (scrollTo) {
    this.emitter.trigger('_scrollRequest', { resourceId: resource.id })
  }

  return new ResourceApi(this, resource)
}

Calendar.prototype.getResourceById = function(this: Calendar, id: string) {
  id = String(id)

  if (this.state.resourceStore) { // guard against calendar with no resource functionality
    let rawResource = this.state.resourceStore[id]

    if (rawResource) {
      return new ResourceApi(this, rawResource)
    }
  }

  return null
}

Calendar.prototype.getResources = function(this: Calendar): ResourceApi[] {
  let { resourceStore } = this.state
  let resourceApis: ResourceApi[] = []

  if (resourceStore) { // guard against calendar with no resource functionality
    for (let resourceId in resourceStore) {
      resourceApis.push(
        new ResourceApi(this, resourceStore[resourceId])
      )
    }
  }

  return resourceApis
}

Calendar.prototype.getTopLevelResources = function(this: Calendar): ResourceApi[] {
  let { resourceStore } = this.state
  let resourceApis: ResourceApi[] = []

  if (resourceStore) { // guard against calendar with no resource functionality
    for (let resourceId in resourceStore) {
      if (!resourceStore[resourceId].parentId) {
        resourceApis.push(
          new ResourceApi(this, resourceStore[resourceId])
        )
      }
    }
  }

  return resourceApis
}

Calendar.prototype.refetchResources = function(this: Calendar) {
  this.state.dispatch({
    type: 'REFETCH_RESOURCES'
  })
}

export function transformDatePoint(dateSpan: DateSpan, context: ReducerContext) {
  return dateSpan.resourceId ?
    { resource: context.calendar.getResourceById(dateSpan.resourceId) } :
    {}
}

export function transformDateSpan(dateSpan: DateSpan, context: ReducerContext) {
  return dateSpan.resourceId ?
    { resource: context.calendar.getResourceById(dateSpan.resourceId) } :
    {}
}
