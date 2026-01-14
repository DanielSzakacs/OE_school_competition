<template>
  <div class="screen-view">
    <teleport v-if="!isScreenCovered" to="#app-header">
      <div v-if="timerSeconds != null" class="screen-timer">{{ timerSeconds }}</div>
    </teleport>
    <div v-if="isScreenCovered" class="screen-cover">
      <div class="screen-cover__logos">
        <img
          src="@/assets/oe_logo.png"
          alt="OE logo"
          class="screen-cover__logo screen-cover__logo--oe"
        />
        <img
          src="@/assets/business.png"
          alt="Business logo"
          class="screen-cover__logo screen-cover__logo--business"
        />
      </div>
    </div>

    <template v-else>
      <div v-if="activeQuestion && showQuestionContent" class="screen-center active-question">
        <h2 class="active-title">
          {{ activeQuestion.category }} — {{ formatPointLabel(activeQuestion.point) }}
        </h2>
        <p class="active-question__text">{{ activeQuestion.question }}</p>
        <div v-if="winnerName" class="active-question__answerer-box">
          <p class="active-question__answerer">Valaszol: {{ winnerName }}</p>
        </div>

        <ul class="active-question__answers">
          <li v-if="hasAnswer(activeQuestion.answerA)">
            <strong>A.</strong> {{ activeQuestion.answerA }}
          </li>
          <li v-if="hasAnswer(activeQuestion.answerB)">
            <strong>B.</strong> {{ activeQuestion.answerB }}
          </li>
          <li v-if="hasAnswer(activeQuestion.answerC)">
            <strong>C.</strong> {{ activeQuestion.answerC }}
          </li>
          <li v-if="hasAnswer(activeQuestion.answerD)">
            <strong>D.</strong> {{ activeQuestion.answerD }}
          </li>
        </ul>

        <div v-if="activeQuestion.image" class="active-question__image">
          <img :src="activeQuestion.image" alt="Kérdés kép" />
        </div>
      </div>

      <div v-else-if="activeQuestion" class="screen-center screen-waiting">
        <p>Figyelem, új kérdés érkezik...</p>
      </div>

      <div v-else class="screen-center">
        <div class="question-board">
          <div
            class="question-board__column"
            v-for="(questions, category) in groupedQuestions"
            :key="category"
          >
            <h3 class="question-board__category">{{ category }}</h3>
            <div
              v-for="question in questions"
              :key="question.id"
              class="question-board__point"
              :class="{ 'question-board__point--disabled': !question.isVisible }"
            >
              {{ formatPointValue(question.point) }}
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useGameStore } from '@/stores/game'
import type { QuestionSummary } from '@/types/game'
import { socket } from '@/socket'

const game = useGameStore()
const nowMs = ref(Date.now())
let timerIntervalId: number | null = null
let introResolve: (() => void) | null = null

const thinkAudio = new Audio('/sfx/think_music.mp3')
thinkAudio.preload = 'auto'
thinkAudio.loop = false

const questionStartAudio = new Audio('/sfx/question_start_music.mp3')
questionStartAudio.preload = 'auto'
questionStartAudio.loop = false

const goodAnswerAudio = new Audio('/sfx/good_answer_music.mp3')
goodAnswerAudio.preload = 'auto'
goodAnswerAudio.loop = false

const badAnswerAudio = new Audio('/sfx/bad_answer.mp3')
badAnswerAudio.preload = 'auto'
badAnswerAudio.loop = false

const showQuestionContent = ref(false)
const isIntroPlaying = ref(false)
const thinkStarted = ref(false)
const fadeIntervals = new Map<HTMLAudioElement, number>()
const badAnswerFadeTimeoutId = ref<number | null>(null)
const expiredQuestionId = ref<number | null>(null)
const revealedQuestionId = ref<number | null>(null)

const cancelFade = (audio: HTMLAudioElement) => {
  const intervalId = fadeIntervals.get(audio)
  if (intervalId) {
    window.clearInterval(intervalId)
    fadeIntervals.delete(audio)
  }
  audio.volume = 1
}

const fadeOutAudio = (
  audio: HTMLAudioElement,
  { resetTime = false }: { resetTime?: boolean } = {},
) => {
  cancelFade(audio)

  const startingVolume = audio.volume || 1
  if (audio.paused || startingVolume === 0) {
    audio.pause()
    if (resetTime) {
      audio.currentTime = 0
    }
    audio.volume = 1
    return Promise.resolve()
  }

  return new Promise<void>((resolve) => {
    const fadeDurationMs = 2000
    const start = performance.now()

    const intervalId = window.setInterval(() => {
      const elapsed = performance.now() - start
      const progress = Math.min(1, elapsed / fadeDurationMs)
      audio.volume = Math.max(0, startingVolume * (1 - progress))

      if (progress >= 1) {
        window.clearInterval(intervalId)
        fadeIntervals.delete(audio)

        audio.pause()
        if (resetTime) {
          audio.currentTime = 0
        }
        audio.volume = 1
        resolve()
      }
    }, 50)

    fadeIntervals.set(audio, intervalId)
  })
}

onMounted(() => {
  game.join('screen')
  timerIntervalId = window.setInterval(() => {
    nowMs.value = Date.now()
  }, 200)
  socket.on('sfx:goodAnswer', handleGoodAnswer)
  socket.on('sfx:badAnswer', handleBadAnswer)
})

onUnmounted(() => {
  if (timerIntervalId) {
    window.clearInterval(timerIntervalId)
  }
  stopAllAudio()
  socket.off('sfx:goodAnswer', handleGoodAnswer)
  socket.off('sfx:badAnswer', handleBadAnswer)
})

const activeQuestion = computed(() => game.state?.activeQuestion ?? null)
const playersList = computed(() => {
  return (game.state?.players ?? []).slice().sort((a, b) => a.seat - b.seat)
})

const winnerSeat = computed(() => game.state?.runtime?.buzzWinnerSeat ?? null)
const isTimerPaused = computed(() => game.state?.runtime?.timerPaused ?? false)
const sfxEnabled = computed(() => game.state?.runtime?.sfxEnabled ?? true)
const isScreenCovered = computed(() => game.state?.runtime?.screenCoverEnabled ?? false)
const trialQuestionsVisible = computed(() => game.state?.runtime?.trialQuestionsVisible ?? true)

const formatPointLabel = (point: number) => (point === 0 ? 'proba' : `${point} pont`)
const formatPointValue = (point: number) => (point === 0 ? 'proba' : point)

const winnerName = computed(() => {
  const seat = winnerSeat.value
  if (seat == null) return null
  return playersList.value.find((p) => p.seat === seat)?.name ?? `Seat ${seat}`
})

const timerRemainingMs = computed(() => {
  const rt = game.state?.runtime
  if (!rt) return null
  if (rt.timerEndsAt != null) {
    return Math.max(0, rt.timerEndsAt - nowMs.value)
  }
  if (rt.timerRemainingMs != null) {
    return rt.timerRemainingMs
  }
  return null
})

const timerSeconds = computed(() => {
  if (!activeQuestion.value || !showQuestionContent.value) return null
  const remaining = timerRemainingMs.value
  if (remaining == null) return null
  return Math.ceil(remaining / 1000)
})

const availableQuestions = computed(() =>
  (game.state?.questions ?? []).filter((q) => trialQuestionsVisible.value || q.point !== 0),
)

const visibleQuestionCount = computed(
  () => availableQuestions.value.filter((q) => q.isVisible).length,
)

const totalQuestionCount = computed(() => availableQuestions.value.length)

const isFirstOrLastQuestion = computed(() => {
  if (!activeQuestion.value) return false
  if (totalQuestionCount.value === 0) return false
  return visibleQuestionCount.value === totalQuestionCount.value || visibleQuestionCount.value === 1
})

const hasAnswer = (value: string | null | undefined) => !!value?.trim()

const groupedQuestions = computed<Record<string, QuestionSummary[]>>(() => {
  const groups: Record<string, QuestionSummary[]> = {}
  const questions = availableQuestions.value

  questions.forEach((q) => {
    const categoryGroup = groups[q.category] ?? []
    categoryGroup.push(q)
    groups[q.category] = categoryGroup
  })

  return groups
})

const playQuestionIntro = () => {
  cancelFade(questionStartAudio)
  questionStartAudio.pause()
  questionStartAudio.currentTime = 0
  questionStartAudio.volume = 1

  if (!sfxEnabled.value) return Promise.resolve()

  return new Promise<void>((resolve) => {
    const cleanup = () => {
      questionStartAudio.onended = null
      introResolve = null
    }

    introResolve = () => {
      cleanup()
      resolve()
    }

    questionStartAudio.onended = () => {
      cleanup()
      resolve()
    }

    questionStartAudio.play().catch(() => {
      cleanup()
      resolve()
    })
  })
}

const skipIntro = () => {
  if (introResolve) {
    introResolve()
  }
}

const stopThinkAudio = () => {
  thinkStarted.value = false
  return fadeOutAudio(thinkAudio, { resetTime: true })
}

const stopThinkAudioImmediately = () => {
  thinkStarted.value = false
  cancelFade(thinkAudio)
  thinkAudio.pause()
  thinkAudio.currentTime = 0
  thinkAudio.volume = 1
}

const stopAllAudio = () => {
  void stopThinkAudio()
  void fadeOutAudio(questionStartAudio, { resetTime: true })
  void fadeOutAudio(goodAnswerAudio, { resetTime: true })
  void fadeOutAudio(badAnswerAudio, { resetTime: true })
  if (badAnswerFadeTimeoutId.value) {
    window.clearTimeout(badAnswerFadeTimeoutId.value)
    badAnswerFadeTimeoutId.value = null
  }
}

const startThinkAudio = () => {
  thinkStarted.value = true
  syncThinkAudio()
}

const syncThinkAudio = () => {
  if (!thinkStarted.value || !activeQuestion.value || !showQuestionContent.value) {
    void fadeOutAudio(thinkAudio)
    return
  }

  if (
    !sfxEnabled.value ||
    isIntroPlaying.value ||
    isTimerPaused.value ||
    winnerSeat.value != null
  ) {
    void fadeOutAudio(thinkAudio)
    return
  }

  cancelFade(thinkAudio)
  thinkAudio.volume = 1
  thinkAudio.play().catch(() => {})
}

const handleGoodAnswer = async () => {
  stopThinkAudioImmediately()
  void fadeOutAudio(questionStartAudio, { resetTime: true })
  if (!sfxEnabled.value) return

  cancelFade(goodAnswerAudio)
  goodAnswerAudio.pause()
  goodAnswerAudio.currentTime = 0
  goodAnswerAudio.volume = 1
  goodAnswerAudio.play().catch(() => {})
}

const handleBadAnswer = async () => {
  if (activeQuestion.value && expiredQuestionId.value === activeQuestion.value.id) return
  if (activeQuestion.value) {
    expiredQuestionId.value = activeQuestion.value.id
  }
  await stopThinkAudio()
  playBadAnswer()
}

const scheduleBadAnswerFade = () => {
  if (badAnswerFadeTimeoutId.value) {
    window.clearTimeout(badAnswerFadeTimeoutId.value)
    badAnswerFadeTimeoutId.value = null
  }

  const fadeDurationMs = 2000
  const durationMs = Number.isFinite(badAnswerAudio.duration) ? badAnswerAudio.duration * 1000 : 0

  if (!durationMs || durationMs <= fadeDurationMs) {
    void fadeOutAudio(badAnswerAudio, { resetTime: true })
    return
  }

  badAnswerFadeTimeoutId.value = window.setTimeout(() => {
    void fadeOutAudio(badAnswerAudio, { resetTime: true })
  }, durationMs - fadeDurationMs)
}

const playBadAnswer = () => {
  if (!sfxEnabled.value) return

  cancelFade(badAnswerAudio)
  badAnswerAudio.pause()
  badAnswerAudio.currentTime = 0
  badAnswerAudio.volume = 1

  if (badAnswerAudio.readyState >= 1) {
    scheduleBadAnswerFade()
  } else {
    badAnswerAudio.onloadedmetadata = () => {
      badAnswerAudio.onloadedmetadata = null
      scheduleBadAnswerFade()
    }
  }

  badAnswerAudio.play().catch(() => {})
}

watch(
  () => activeQuestion.value?.id ?? null,
  async (questionId) => {
    void stopThinkAudio()
    showQuestionContent.value = false
    expiredQuestionId.value = null
    revealedQuestionId.value = null
    cancelFade(badAnswerAudio)
    if (badAnswerFadeTimeoutId.value) {
      window.clearTimeout(badAnswerFadeTimeoutId.value)
      badAnswerFadeTimeoutId.value = null
    }

    if (!questionId || !activeQuestion.value) {
      isIntroPlaying.value = false
      return
    }

    const needsIntro = isFirstOrLastQuestion.value
    if (needsIntro) {
      isIntroPlaying.value = true
      await playQuestionIntro()
      isIntroPlaying.value = false
    }

    showQuestionContent.value = true
    startThinkAudio()
  },
  { immediate: true },
)

watch(
  () => isTimerPaused.value,
  (paused) => {
    if (!activeQuestion.value) return
    if (paused) {
      void fadeOutAudio(thinkAudio)
    } else {
      syncThinkAudio()
    }
  },
)

watch(
  () => winnerSeat.value,
  () => {
    if (!activeQuestion.value) return
    if (winnerSeat.value != null) {
      void fadeOutAudio(thinkAudio)
    } else {
      syncThinkAudio()
    }
  },
)

watch(sfxEnabled, (enabled) => {
  if (!enabled) {
    void fadeOutAudio(thinkAudio)
    void fadeOutAudio(questionStartAudio, { resetTime: true })
    void fadeOutAudio(goodAnswerAudio, { resetTime: true })
    void fadeOutAudio(badAnswerAudio, { resetTime: true })
    if (isIntroPlaying.value) {
      skipIntro()
      isIntroPlaying.value = false
      showQuestionContent.value = true
    }
    return
  }

  if (isIntroPlaying.value) return
  syncThinkAudio()
})

watch(showQuestionContent, (visible) => {
  syncThinkAudio()
  if (!visible || !activeQuestion.value) return
  if (revealedQuestionId.value === activeQuestion.value.id) return
  socket.emit('question:reveal', { questionId: activeQuestion.value.id })
  revealedQuestionId.value = activeQuestion.value.id
})

watch(
  () => timerRemainingMs.value,
  (remaining) => {
    if (
      remaining == null ||
      remaining > 0 ||
      !activeQuestion.value ||
      !showQuestionContent.value ||
      isTimerPaused.value ||
      winnerSeat.value != null
    ) {
      return
    }

    if (expiredQuestionId.value === activeQuestion.value.id) return
    expiredQuestionId.value = activeQuestion.value.id

    void stopThinkAudio()
    playBadAnswer()
  },
)
</script>

<style scoped>
.screen-view {
  min-height: calc(100vh - 160px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: #f5f7ff;
  position: relative;
}

.screen-cover {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(to right, #162039 0%, #162039 100%);
  padding: clamp(24px, 4vw, 64px);
}

.screen-cover__logos {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(24px, 4vw, 64px);
  width: min(92vw, 1600px);
}

.screen-cover__logo {
  height: auto;
  max-height: min(55vh, 520px);
  max-width: 45vw;
}

.screen-cover__logo--oe {
  width: clamp(220px, 32vw, 520px);
  margin-bottom: 4%;
}

.screen-cover__logo--business {
  width: clamp(200px, 30vw, 251px);
}

.screen-center {
  width: 100%;
  display: flex;
  justify-content: center;
}

.question-board {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 32px;
  width: min(100%, 1320px);
}

.question-board__column {
  display: grid;
  gap: 16px;
}

.question-board__category {
  text-align: center;
  background: rgba(112, 156, 189, 0.45);
  color: #f4f8ff;
  padding: 16px 20px;
  border-radius: 16px;
  font-size: 1.35rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.question-board__point {
  text-align: center;
  background: #ffffff;
  color: #1b2239;
  padding: 16px 20px;
  border-radius: 16px;
  font-size: 1.4rem;
  font-weight: 700;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.question-board__point--disabled {
  background: rgba(148, 156, 170, 0.65);
  color: rgba(240, 243, 248, 0.7);
  box-shadow: none;
}

.active-question {
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: clamp(16px, 2.2vw, 28px);
  width: min(95vw, 1400px);
}

.screen-timer {
  font-size: clamp(1.8rem, 3.6vw, 3rem);
  font-weight: 700;
  background: linear-gradient(to right, #eba313 0%, #eba313 100%);
  -webkit-background-clip: text;
  color: transparent;
}

.active-title {
  font-size: clamp(1.6rem, 3.2vw, 2.8rem);
}

.active-question__text {
  font-size: clamp(1.3rem, 2.6vw, 2rem);
  max-width: min(92vw, 1200px);
  line-height: 1.3;
}

.active-question__answerer {
  font-size: clamp(1.1rem, 2.2vw, 1.6rem);
  font-weight: 600;
  color: rgba(248, 251, 255, 0.9);
}

.active-question__answers {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(10px, 1.8vw, 18px);
  font-size: clamp(1.15rem, 2.3vw, 1.75rem);
}

.active-question__answerer-box {
  background: linear-gradient(to right, #76af63 0%);
  padding: 12px 18px;
  border-radius: 16px;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.25);
}

.active-question__answers li {
  background: rgba(255, 255, 255, 0.08);
  padding: 12px 16px;
  border-radius: 12px;
}

.active-question__image img {
  max-width: min(90vw, 640px);
  max-height: 40vh;
  border-radius: 16px;
  object-fit: contain;
}

.screen-waiting {
  color: rgba(244, 248, 255, 0.85);
  font-size: clamp(1.2rem, 2.2vw, 1.6rem);
  font-weight: 600;
  min-height: calc(60vh - 120px);
  align-items: center;
  display: flex;
  justify-content: center;
  text-align: center;
}

@media (max-width: 640px) {
  .screen-view {
    padding: 16px;
  }

  .question-board {
    gap: 16px;
    width: 100%;
  }
}
</style>
