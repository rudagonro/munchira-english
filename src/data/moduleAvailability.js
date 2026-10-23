/**
 * Lógica de bloqueo/desbloqueo de módulos dentro de un ciclo.
 *
 * Reglas:
 * - El módulo 1 siempre está disponible.
 * - Un módulo N (N>1) está disponible si el módulo N-1 está 'completed'
 *   Y no existe un checkpoint definido en after_module_order < N que
 *   aún no haya sido aprobado (passed=true en algún intento).
 * - Un checkpoint se vuelve "exigible" tan pronto el estudiante completa
 *   el módulo en after_module_order; bloquea todo lo que sigue hasta
 *   aprobarse.
 */
export function computeModuleAvailability(modules, progressList, checkpoints, checkpointAttempts) {
  const progressByModule = {}
  progressList.forEach((p) => { progressByModule[p.module_id] = p })

  const passedCheckpointIds = new Set(
    checkpointAttempts.filter((a) => a.passed).map((a) => a.checkpoint_id)
  )

  const sortedModules = [...modules].sort((a, b) => a.order_index - b.order_index)
  const result = []

  let blocked = false
  let blockingCheckpoint = null

  for (const mod of sortedModules) {
    // Antes de evaluar este módulo, revisa si hay un checkpoint pendiente
    // en un order_index menor al de este módulo.
    const pendingCheckpoint = checkpoints.find(
      (cp) => cp.after_module_order < mod.order_index && !passedCheckpointIds.has(cp.id)
    )

    if (pendingCheckpoint) {
      // Solo bloquea si el módulo correspondiente al checkpoint ya se completó
      // (si no se completó, el bloqueo real es por el módulo anterior, no el checkpoint)
      const moduleAtCheckpoint = sortedModules.find((m) => m.order_index === pendingCheckpoint.after_module_order)
      const moduleAtCheckpointDone = moduleAtCheckpoint && progressByModule[moduleAtCheckpoint.id]?.status === 'completed'
      if (moduleAtCheckpointDone) {
        blocked = true
        blockingCheckpoint = pendingCheckpoint
      }
    }

    const progress = progressByModule[mod.id]
    const status = progress?.status ?? 'locked'

    let available
    if (mod.order_index === 1) {
      available = true
    } else {
      const prevModule = sortedModules.find((m) => m.order_index === mod.order_index - 1)
      const prevDone = prevModule && progressByModule[prevModule.id]?.status === 'completed'
      available = prevDone && !blocked
    }

    result.push({
      ...mod,
      status: available ? status : 'locked',
      quizScore: progress?.quiz_score ?? null,
      available,
      blockingCheckpoint: available ? null : blockingCheckpoint,
    })
  }

  return result
}

export function getCheckpointForModule(checkpoints, moduleOrderIndex) {
  return checkpoints.find((cp) => cp.after_module_order === moduleOrderIndex) ?? null
}

export function isCheckpointPassed(checkpointId, checkpointAttempts) {
  return checkpointAttempts.some((a) => a.checkpoint_id === checkpointId && a.passed)
}

export function isCycleComplete(modules, progressList, checkpoints = [], checkpointAttempts = []) {
  if (modules.length === 0) return false
  const progressByModule = {}
  progressList.forEach((p) => { progressByModule[p.module_id] = p })
  return modules.every((m) => progressByModule[m.id]?.status === 'completed')
    && checkpoints.every((cp) => isCheckpointPassed(cp.id, checkpointAttempts))
}
